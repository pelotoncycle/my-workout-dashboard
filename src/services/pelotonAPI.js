import axios from 'axios';

// Use empty base URL to leverage Vite proxy (configured in vite.config.js)
const PELOTON_API_BASE = '';

// Store the auth token
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

// Create axios instance with auth
const createAxiosInstance = () => {
  return axios.create({
    baseURL: PELOTON_API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Get workout history
export const getWorkoutHistory = async (userId, limit = 50, page = 0) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/user/${userId}/workouts`, {
      params: {
        limit,
        page,
        joins: 'ride,ride.instructor',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching workout history:', error);
    throw error;
  }
};

// Get ALL workout history with pagination (API caps at 100 per page)
export const getAllWorkoutHistory = async (userId, onFirstPage) => {
  const api = createAxiosInstance();
  const allWorkouts = [];
  let page = 0;
  let total = 0;
  const PAGE_SIZE = 100;

  try {
    while (true) {
      const response = await api.get(`/api/user/${userId}/workouts`, {
        params: {
          limit: PAGE_SIZE,
          page,
          joins: 'ride,ride.instructor',
        },
      });
      const data = response.data;
      if (page === 0) {
        total = data.total || 0;
      }
      const workouts = data.data || [];
      if (workouts.length === 0) break;
      allWorkouts.push(...workouts);

      // After the first page, let the caller render immediately
      if (page === 0 && onFirstPage) {
        onFirstPage({ data: [...allWorkouts], total });
      }

      // Stop if we've fetched all workouts or got fewer than a full page
      if (allWorkouts.length >= total || workouts.length < PAGE_SIZE) break;
      page++;
    }
  } catch (error) {
    console.error('Error fetching all workout history:', error);
    throw error;
  }

  return { data: allWorkouts, total };
};

// Enrich workouts with performance_graph data (all available metrics)
const performanceCache = new Map();

// All known metric slugs from Peloton performance_graph API
const METRIC_SLUGS = ['heart_rate', 'output', 'speed', 'cadence', 'resistance', 'pace', 'incline', 'altitude', 'stroke_rate', 'form_score'];

// Cache for strength workout detail data (movement tracker + muscle groups)
const strengthDetailCache = new Map();

export const enrichWorkoutsWithPerformance = async (workouts, onProgress) => {
  const BATCH_SIZE = 5;
  let completed = 0;

  for (let i = 0; i < workouts.length; i += BATCH_SIZE) {
    const batch = workouts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (workout) => {
      if (performanceCache.has(workout.id)) {
        Object.assign(workout, performanceCache.get(workout.id));
        return;
      }

      try {
        const perf = await getWorkoutPerformance(workout.id);
        const enriched = {};

        // Extract all summaries
        if (perf.summaries) {
          const calSummary = perf.summaries.find(s => s.slug === 'calories');
          if (calSummary) {
            enriched.calories = Math.round(calSummary.value || 0);
          }
          const distSummary = perf.summaries.find(s => s.slug === 'distance');
          if (distSummary) {
            enriched.distance = distSummary.value || 0;
          }
          // Elevation gain from summaries
          const elevSummary = perf.summaries.find(s => s.slug === 'elevation_gain' || s.slug === 'total_elevation');
          if (elevSummary) {
            enriched.elevation_gain = elevSummary.value || 0;
          }
        }

        // Extract all metric time series generically
        if (perf.metrics) {
          for (const slug of METRIC_SLUGS) {
            const metric = perf.metrics.find(m => m.slug === slug);
            if (metric && metric.values && metric.values.length > 0) {
              const values = metric.values.filter(v => v > 0);
              if (values.length > 0) {
                enriched[`${slug}_values`] = values;
              }
            }
          }

          // Derive speed_values from pace_values when speed is missing
          if (enriched.pace_values && !enriched.speed_values) {
            enriched.speed_values = enriched.pace_values.map(p => p > 0 ? 60 / p : 0).filter(v => v > 0);
          }

          // Backward-compatible aliases
          if (enriched.heart_rate_values) {
            enriched.hr_values = enriched.heart_rate_values;
            enriched.avg_heart_rate = Math.round(
              enriched.heart_rate_values.reduce((sum, v) => sum + v, 0) / enriched.heart_rate_values.length
            );
          }
        }

        performanceCache.set(workout.id, enriched);
        Object.assign(workout, enriched);
      } catch (error) {
        console.warn(`Failed to fetch performance for workout ${workout.id}:`, error.message);
      }
    }));

    completed += batch.length;
    if (onProgress) {
      onProgress(Math.min(completed, workouts.length), workouts.length);
    }
  }

  return workouts;
};

// Enrich strength workouts with detail data (movement tracker + muscle group).
// Separate from performance enrichment so it can cover ALL strength workouts, not just recent ones.
export const enrichStrengthDetails = async (workouts, onProgress) => {
  const strengthWorkouts = workouts.filter(w => w.fitness_discipline === 'strength');
  if (strengthWorkouts.length === 0) return workouts;

  const BATCH_SIZE = 5;
  let completed = 0;

  for (let i = 0; i < strengthWorkouts.length; i += BATCH_SIZE) {
    const batch = strengthWorkouts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (workout) => {
      if (strengthDetailCache.has(workout.id)) {
        Object.assign(workout, strengthDetailCache.get(workout.id));
        return;
      }
      try {
        const details = await getWorkoutDetails(workout.id);
        const strengthData = {
          movement_tracker_data: details.movement_tracker_data || null,
          muscle_group_score: details.ride?.muscle_group_score || null,
        };
        strengthDetailCache.set(workout.id, strengthData);
        Object.assign(workout, strengthData);
      } catch (err) {
        console.warn(`Failed to fetch strength details for workout ${workout.id}:`, err.message);
        strengthDetailCache.set(workout.id, { movement_tracker_data: null, muscle_group_score: null });
      }
    }));
    completed += batch.length;
    if (onProgress) {
      onProgress(Math.min(completed, strengthWorkouts.length), strengthWorkouts.length);
    }
  }

  return workouts;
};

// Get workout details (with joins to ensure ride data is included)
export const getWorkoutDetails = async (workoutId) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/workout/${workoutId}`, {
      params: { joins: 'ride' },
      timeout: 10000, // 10s timeout to avoid hanging enrichment
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching workout details:', error);
    throw error;
  }
};

// Get performance graph data (heart rate zones, output, etc.)
export const getWorkoutPerformance = async (workoutId) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/workout/${workoutId}/performance_graph`, {
      params: {
        every_n: 5,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching workout performance:', error);
    throw error;
  }
};

// Search users (if your token has permissions)
export const searchUsers = async (query) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/user/search`, {
      params: {
        username: query,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Get user achievements
export const getUserAchievements = async (userId) => {
  try {
    const api = createAxiosInstance();
    const response = await api.get(`/api/user/${userId}/achievements`);
    return response.data;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    throw error;
  }
};

// Get me (current authenticated user)
export const getMe = async () => {
  try {
    const api = createAxiosInstance();
    const response = await api.get('/api/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

// Available fitness goals (Peloton API does not expose a goals endpoint;
// these are the options available in the Peloton app)
export const AVAILABLE_GOALS = [
  { id: 'promote_longevity', name: 'Promote Longevity' },
  { id: 'boost_cardio', name: 'Boost Cardio Fitness' },
  { id: 'build_strength', name: 'Build Strength' },
  { id: 'weight_loss', name: 'Support Weight Goals' },
];

// Get user goal from localStorage (Peloton API does not expose /user/{id}/goals)
export const getUserGoals = (userId) => {
  const stored = localStorage.getItem(`peloton_goal_${userId}`);
  if (!stored) {
    // Default to promote_longevity for first-time users; they can change via the picker
    localStorage.setItem(`peloton_goal_${userId}`, 'promote_longevity');
    return { current_goal: 'promote_longevity' };
  }
  return { current_goal: stored };
};

// Set user fitness goal to localStorage
export const setUserGoal = (userId, goalId) => {
  localStorage.setItem(`peloton_goal_${userId}`, goalId);
  return { current_goal: goalId };
};

// Get user weekly targets from localStorage (Peloton API does not expose /user/{id}/weekly_targets)
export const getUserTargets = (userId) => {
  const stored = localStorage.getItem(`peloton_targets_${userId}`);
  return stored ? JSON.parse(stored) : null;
};

// Set user weekly targets to localStorage
export const setUserTargets = (userId, targets) => {
  if (targets === null) {
    localStorage.removeItem(`peloton_targets_${userId}`);
    return null;
  }
  localStorage.setItem(`peloton_targets_${userId}`, JSON.stringify(targets));
  return targets;
};

// --- Fitness Details Calculation Functions ---

// Derive max HR from user profile. Uses custom value if set, otherwise 220 - age from birthday.
export const deriveMaxHR = (user) => {
  if (user?.default_max_heart_rate) return user.default_max_heart_rate;
  if (user?.birthday) {
    // birthday is epoch seconds from the Peloton API
    const birthDate = new Date(user.birthday * 1000);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return 220 - age;
  }
  return 190; // last-resort fallback
};

// Derive HR zone boundaries from max HR. Uses custom zones if set, otherwise standard percentages.
export const deriveHRZones = (user, maxHR) => {
  if (user?.default_heart_rate_zones && user.default_heart_rate_zones.length >= 5) {
    return user.default_heart_rate_zones;
  }
  // Standard zone boundaries: 0%, 65%, 75%, 85%, 95% of max HR
  return [
    0,
    Math.round(maxHR * 0.65 * 10) / 10,
    Math.round(maxHR * 0.75 * 10) / 10,
    Math.round(maxHR * 0.85 * 10) / 10,
    Math.round(maxHR * 0.95 * 10) / 10,
  ];
};

// Discipline categories for tabs
export const DISCIPLINE_CATEGORIES = {
  cardio: ['cycling', 'running', 'walking', 'cardio', 'rowing', 'bike_bootcamp', 'tread_bootcamp', 'outdoor', 'caesar'],
  strength: ['strength', 'yoga', 'stretching', 'pilates', 'circuit'],
};

// Cardio sub-discipline categories for discipline-specific metrics
export const CARDIO_SUBDISCIPLINES = {
  tread: { id: 'tread', name: 'Run/Walk', disciplines: ['running', 'walking', 'tread_bootcamp', 'outdoor'] },
  bike:  { id: 'bike',  name: 'Cycling',  disciplines: ['cycling', 'bike_bootcamp'] },
  row:   { id: 'row',   name: 'Rowing',   disciplines: ['rowing', 'caesar'] },
};

// Filter workouts by cardio sub-discipline
export const filterWorkoutsBySubDiscipline = (workouts, subDisciplineId) => {
  if (!subDisciplineId || !CARDIO_SUBDISCIPLINES[subDisciplineId]) return workouts;
  const disciplines = CARDIO_SUBDISCIPLINES[subDisciplineId].disciplines;
  return workouts.filter(w => disciplines.includes(w.fitness_discipline));
};

// Filter workouts by discipline category
export const filterWorkoutsByCategory = (workouts, category) => {
  if (!category || category === 'all') return workouts;
  const disciplines = DISCIPLINE_CATEGORIES[category] || [];
  return workouts.filter(w => disciplines.includes(w.fitness_discipline));
};

// Filter workouts by time period (last N days)
export const filterWorkoutsByPeriod = (workouts, days) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);
  const cutoff = cutoffDate.getTime() / 1000;
  return workouts.filter(w => w.start_time >= cutoff);
};

// Calculate time by discipline for a set of workouts
export const calculateTimeByDiscipline = (workouts) => {
  const byDiscipline = {};
  let totalSeconds = 0;
  workouts.forEach(w => {
    const discipline = w.fitness_discipline || 'unknown';
    const duration = (w.end_time - w.start_time) || 0;
    byDiscipline[discipline] = (byDiscipline[discipline] || 0) + duration;
    totalSeconds += duration;
  });
  return { byDiscipline, totalSeconds };
};

// --- Training Stress Calculations ---

// Calculate Normalized Power from a watts time series.
// NP = 4th root of the mean of 30-second rolling averages raised to the 4th power.
const calculateNormalizedPower = (outputValues) => {
  if (!outputValues || outputValues.length === 0) return 0;

  const windowSize = Math.ceil(30 / HR_SAMPLE_SECONDS); // 30s window in samples (6 for 5s samples)
  if (outputValues.length < windowSize) {
    // Too short for rolling average — use simple average
    return outputValues.reduce((s, v) => s + v, 0) / outputValues.length;
  }

  // Compute 30-second rolling averages
  const rollingAvgs = [];
  let windowSum = 0;
  for (let i = 0; i < outputValues.length; i++) {
    windowSum += outputValues[i];
    if (i >= windowSize) {
      windowSum -= outputValues[i - windowSize];
    }
    if (i >= windowSize - 1) {
      rollingAvgs.push(windowSum / windowSize);
    }
  }

  // 4th power average, then 4th root
  const fourthPowerAvg = rollingAvgs.reduce((s, v) => s + Math.pow(v, 4), 0) / rollingAvgs.length;
  return Math.pow(fourthPowerAvg, 0.25);
};

// Estimate FTP from cycling workout history (95% of best 20-min average power).
export const estimateFTP = (workouts) => {
  const CYCLING_DISCIPLINES = ['cycling', 'bike_bootcamp'];
  const MIN_DURATION = 20 * 60; // 20 minutes in seconds

  let bestAvgPower = 0;

  workouts.forEach(w => {
    if (!CYCLING_DISCIPLINES.includes(w.fitness_discipline)) return;
    const duration = (w.end_time - w.start_time) || 0;
    if (duration < MIN_DURATION) return;

    if (w.output_values && w.output_values.length > 0) {
      // Find best 20-min window from time series
      const windowSamples = Math.ceil(MIN_DURATION / HR_SAMPLE_SECONDS);
      if (w.output_values.length >= windowSamples) {
        let windowSum = 0;
        for (let i = 0; i < windowSamples; i++) windowSum += w.output_values[i];
        let maxWindowAvg = windowSum / windowSamples;
        for (let i = windowSamples; i < w.output_values.length; i++) {
          windowSum += w.output_values[i] - w.output_values[i - windowSamples];
          maxWindowAvg = Math.max(maxWindowAvg, windowSum / windowSamples);
        }
        bestAvgPower = Math.max(bestAvgPower, maxWindowAvg);
      }
    } else if (w.total_work && duration > 0) {
      // Fallback: average power from total_work (joules) / duration
      const avgPower = w.total_work / duration;
      bestAvgPower = Math.max(bestAvgPower, avgPower);
    }
  });

  return bestAvgPower > 0 ? Math.round(bestAvgPower * 0.95) : null;
};

// Estimate running threshold speed from best sustained efforts.
// Uses best average speed from runs >= 20 minutes as proxy for threshold pace.
const estimateThresholdSpeed = (workouts) => {
  const RUN_DISCIPLINES = ['running', 'walking', 'tread_bootcamp', 'outdoor'];
  const MIN_DURATION = 20 * 60;

  let bestAvgSpeed = 0;

  workouts.forEach(w => {
    if (!RUN_DISCIPLINES.includes(w.fitness_discipline)) return;
    const duration = (w.end_time - w.start_time) || 0;
    if (duration < MIN_DURATION) return;

    if (w.speed_values && w.speed_values.length > 0) {
      const windowSamples = Math.ceil(MIN_DURATION / HR_SAMPLE_SECONDS);
      if (w.speed_values.length >= windowSamples) {
        let windowSum = 0;
        for (let i = 0; i < windowSamples; i++) windowSum += w.speed_values[i];
        let maxWindowAvg = windowSum / windowSamples;
        for (let i = windowSamples; i < w.speed_values.length; i++) {
          windowSum += w.speed_values[i] - w.speed_values[i - windowSamples];
          maxWindowAvg = Math.max(maxWindowAvg, windowSum / windowSamples);
        }
        bestAvgSpeed = Math.max(bestAvgSpeed, maxWindowAvg);
      } else {
        const avg = w.speed_values.reduce((s, v) => s + v, 0) / w.speed_values.length;
        bestAvgSpeed = Math.max(bestAvgSpeed, avg);
      }
    }
  });

  return bestAvgSpeed > 0 ? bestAvgSpeed * 0.95 : null;
};

// TSS for cycling/rowing: (seconds × NP × IF) / (FTP × 3600) × 100
// where IF = NP / FTP
const calculateTSS = (durationSeconds, np, ftp) => {
  if (!ftp || ftp <= 0 || !np) return null;
  const intensityFactor = np / ftp;
  return (durationSeconds * np * intensityFactor) / (ftp * 3600) * 100;
};

// rTSS for running/walking: (duration_hours) × (IF²) × 100
// where IF = Normalized Graded Pace / Threshold Pace (using speed: higher = faster)
const calculaterTSS = (durationSeconds, avgSpeed, thresholdSpeed) => {
  if (!thresholdSpeed || thresholdSpeed <= 0 || !avgSpeed) return null;
  const intensityFactor = avgSpeed / thresholdSpeed;
  return (durationSeconds / 3600) * Math.pow(intensityFactor, 2) * 100;
};

// Calculate training load for a single workout.
// Priority: HR time series TRIMP > avg HR TRIMP > TSS/rTSS > raw duration.
const POWER_DISCIPLINES = ['cycling', 'bike_bootcamp', 'rowing', 'caesar'];
const PACE_DISCIPLINES = ['running', 'walking', 'tread_bootcamp', 'outdoor'];

const calculateWorkoutLoad = (workout, maxHR, ftp, thresholdSpeed, restingHR = 60) => {
  const duration = ((workout.end_time - workout.start_time) || 0) / 60; // minutes
  const durationSec = duration * 60;

  // 1. Best: per-datapoint TRIMP from HR time series
  if (workout.hr_values && workout.hr_values.length > 0 && maxHR && maxHR > restingHR) {
    const sampleMinutes = HR_SAMPLE_SECONDS / 60;
    let trimp = 0;
    workout.hr_values.forEach(hr => {
      const hrFraction = Math.max(0, (hr - restingHR) / (maxHR - restingHR));
      trimp += sampleMinutes * hrFraction * 0.64 * Math.exp(1.92 * hrFraction);
    });
    return trimp;
  }

  // 2. Avg HR TRIMP
  if (workout.avg_heart_rate && maxHR && maxHR > restingHR) {
    const hrFraction = Math.max(0, (workout.avg_heart_rate - restingHR) / (maxHR - restingHR));
    return duration * hrFraction * 0.64 * Math.exp(1.92 * hrFraction);
  }

  // 3. TSS for cycling/rowing (power-based)
  const discipline = workout.fitness_discipline || '';
  if (POWER_DISCIPLINES.includes(discipline) && ftp) {
    if (workout.output_values && workout.output_values.length > 0) {
      const np = calculateNormalizedPower(workout.output_values);
      const tss = calculateTSS(durationSec, np, ftp);
      if (tss !== null) return tss;
    }
    // Fallback: use total_work for average power
    if (workout.total_work && durationSec > 0) {
      const avgPower = workout.total_work / durationSec;
      const tss = calculateTSS(durationSec, avgPower, ftp);
      if (tss !== null) return tss;
    }
  }

  // 4. rTSS for running/walking (pace-based)
  if (PACE_DISCIPLINES.includes(discipline) && thresholdSpeed) {
    if (workout.speed_values && workout.speed_values.length > 0) {
      const avgSpeed = workout.speed_values.reduce((s, v) => s + v, 0) / workout.speed_values.length;
      const rtss = calculaterTSS(durationSec, avgSpeed, thresholdSpeed);
      if (rtss !== null) return rtss;
    }
  }

  // 5. No data — raw duration as rough proxy
  return duration;
};

// Calculate Training Load (Acute:Chronic workload ratio)
export const calculateTrainingLoad = (workouts, maxHR) => {
  if (!workouts || workouts.length === 0) {
    return { acute: 0, chronic: 0, ratio: null, status: 'No Data' };
  }

  const now = Date.now() / 1000;

  // Estimate FTP and threshold speed from full workout history for TSS/rTSS fallbacks
  const ftp = estimateFTP(workouts);
  const thresholdSpeed = estimateThresholdSpeed(workouts);

  // Calculate daily load for last 42 days
  const dailyLoad = new Array(42).fill(0);
  workouts.forEach(w => {
    const daysAgo = Math.floor((now - w.start_time) / 86400);
    if (daysAgo >= 0 && daysAgo < 42) {
      dailyLoad[daysAgo] += calculateWorkoutLoad(w, maxHR, ftp, thresholdSpeed);
    }
  });

  // Exponentially weighted moving average
  // ATL (acute) = 7-day EWMA, CTL (chronic) = 42-day EWMA
  let atl = 0;
  let ctl = 0;
  const atlDecay = 2 / (7 + 1);
  const ctlDecay = 2 / (42 + 1);

  // Process from oldest to newest
  for (let i = 41; i >= 0; i--) {
    atl = atl * (1 - atlDecay) + dailyLoad[i] * atlDecay;
    ctl = ctl * (1 - ctlDecay) + dailyLoad[i] * ctlDecay;
  }

  const ratio = ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : null;

  let status;
  if (ratio === null) status = 'Building';
  else if (ratio < 0.8) status = 'Detraining';
  else if (ratio <= 1.3) status = 'Optimal';
  else if (ratio <= 1.5) status = 'Overreaching';
  else status = 'Overtraining';

  return { acute: Math.round(atl), chronic: Math.round(ctl), ratio, status };
};

// Calculate active days calendar data for last N days
export const calculateActiveDaysCalendar = (workouts, days = 30) => {
  const cutoff = Date.now() / 1000 - (days * 86400);
  const filtered = workouts.filter(w => w.start_time >= cutoff);
  const dayMap = {};

  filtered.forEach(w => {
    const date = new Date(w.start_time * 1000);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!dayMap[key]) {
      dayMap[key] = { count: 0, totalDuration: 0 };
    }
    dayMap[key].count += 1;
    dayMap[key].totalDuration += ((w.end_time - w.start_time) || 0) / 60;
  });

  const activeDays = Object.keys(dayMap).length;
  return { activeDays, totalDays: days, dayMap };
};

// Calculate daily and weekly streaks from all workout history
export const calculateStreaks = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return { currentDaily: 0, bestDaily: 0, currentWeekly: 0, bestWeekly: 0 };
  }

  // Build a Set of all active date strings (YYYY-MM-DD)
  const activeDates = new Set();
  workouts.forEach(w => {
    const d = new Date(w.start_time * 1000);
    activeDates.add(d.toISOString().split('T')[0]);
  });

  // --- Daily streak ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0];

  // Start from today (or yesterday if today has no workout yet)
  let startDate = new Date(today);
  if (!activeDates.has(todayKey)) {
    startDate.setDate(startDate.getDate() - 1);
    if (!activeDates.has(startDate.toISOString().split('T')[0])) {
      // No workout today or yesterday — current streak is 0
      // Still need to find best streak below
    }
  }

  // Current daily streak: count backwards from startDate
  let currentDaily = 0;
  const cursor = new Date(startDate);
  while (activeDates.has(cursor.toISOString().split('T')[0])) {
    currentDaily++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best daily streak: scan all dates chronologically
  const sortedDates = Array.from(activeDates).sort();
  let bestDaily = 0;
  let runDaily = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      runDaily++;
    } else {
      bestDaily = Math.max(bestDaily, runDaily);
      runDaily = 1;
    }
  }
  bestDaily = Math.max(bestDaily, runDaily);
  if (sortedDates.length === 0) bestDaily = 0;

  // --- Weekly streak ---
  // Build a Set of active week keys (ISO week: YYYY-WNN)
  const getWeekKey = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Find Monday of this week
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    const year = d.getFullYear();
    // Week number: days since Jan 1 of that year's Monday-based week
    const jan1 = new Date(year, 0, 1);
    const dayOfYear = Math.floor((d - jan1) / 86400000);
    const weekNum = Math.floor(dayOfYear / 7) + 1;
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  };

  const activeWeeks = new Set();
  workouts.forEach(w => {
    activeWeeks.add(getWeekKey(new Date(w.start_time * 1000)));
  });

  // Current weekly streak: count backwards from current week
  let currentWeekly = 0;
  const weekCursor = new Date(today);
  while (activeWeeks.has(getWeekKey(weekCursor))) {
    currentWeekly++;
    weekCursor.setDate(weekCursor.getDate() - 7);
  }

  // Best weekly streak: generate all weeks from oldest to newest and scan
  const oldestTime = Math.min(...workouts.map(w => w.start_time));
  const oldestDate = new Date(oldestTime * 1000);
  const allWeekKeys = [];
  const wk = new Date(oldestDate);
  // Align to Monday
  const wkDay = wk.getDay();
  wk.setDate(wk.getDate() - (wkDay === 0 ? 6 : wkDay - 1));
  wk.setHours(0, 0, 0, 0);
  while (wk <= today) {
    allWeekKeys.push(getWeekKey(wk));
    wk.setDate(wk.getDate() + 7);
  }

  let bestWeekly = 0;
  let runWeekly = 0;
  allWeekKeys.forEach(key => {
    if (activeWeeks.has(key)) {
      runWeekly++;
      bestWeekly = Math.max(bestWeekly, runWeekly);
    } else {
      runWeekly = 0;
    }
  });

  return { currentDaily, bestDaily, currentWeekly, bestWeekly };
};

// Calculate calories in a period
export const calculateCaloriesInPeriod = (workouts) => {
  return workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
};

// --- Cardio Discipline-Specific Calculation Functions ---

// Shared: Calculate distance (total + avg per workout)
export const calculateDistance = (workouts) => {
  const withDistance = workouts.filter(w => w.distance && w.distance > 0);
  const total = withDistance.reduce((sum, w) => sum + w.distance, 0);
  const avg = withDistance.length > 0 ? total / withDistance.length : 0;
  return { total: Math.round(total * 100) / 100, avg: Math.round(avg * 100) / 100, count: withDistance.length };
};

// Shared: Calculate avg pace/speed from speed_values (falls back to pace_values)
export const calculateAvgPaceSpeed = (workouts) => {
  let totalSpeed = 0;
  let sampleCount = 0;
  workouts.forEach(w => {
    if (w.speed_values && w.speed_values.length > 0) {
      totalSpeed += w.speed_values.reduce((s, v) => s + v, 0);
      sampleCount += w.speed_values.length;
    } else if (w.pace_values && w.pace_values.length > 0) {
      // Fallback: convert pace (min/mi) to speed (mph) on the fly
      w.pace_values.forEach(p => {
        if (p > 0) {
          totalSpeed += 60 / p;
          sampleCount++;
        }
      });
    }
  });
  if (sampleCount === 0) return null;
  const avgSpeed = totalSpeed / sampleCount; // mph
  // Convert to pace (min/mile): 60 / speed
  const paceMinutes = avgSpeed > 0 ? 60 / avgSpeed : 0;
  const paceMin = Math.floor(paceMinutes);
  const paceSec = Math.round((paceMinutes - paceMin) * 60);
  return {
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    pace: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
    paceMinutes,
  };
};

// Tread: Calculate pace split by discipline (running vs walking)
export const calculatePaceSplitByDiscipline = (workouts) => {
  const running = workouts.filter(w => w.fitness_discipline === 'running');
  const walking = workouts.filter(w => w.fitness_discipline === 'walking');
  return {
    running: running.length > 0 ? calculateAvgPaceSpeed(running) : null,
    walking: walking.length > 0 ? calculateAvgPaceSpeed(walking) : null,
  };
};

// Shared: Calculate output (total + avg per workout)
export const calculateAvgOutput = (workouts) => {
  let totalOutput = 0;
  let count = 0;
  workouts.forEach(w => {
    const output = w.total_work || 0;
    if (output > 0) {
      totalOutput += output;
      count++;
    }
  });
  return {
    total: Math.round(totalOutput / 1000), // kJ
    avg: count > 0 ? Math.round(totalOutput / count / 1000) : 0,
    count,
  };
};

// Shared: Calculate personal records across all-time history for a sub-discipline
export const calculatePersonalRecords = (workouts) => {
  const records = {
    bestOutput: null,      // highest total_work in a single workout
    bestDistance: null,     // longest distance in a single workout
    bestSpeed: null,       // highest avg speed in a single workout
    bestCalories: null,    // highest calories in a single workout
    bestDuration: null,    // longest workout duration
  };

  workouts.forEach(w => {
    const duration = (w.end_time - w.start_time) || 0;

    if (w.total_work && (!records.bestOutput || w.total_work > records.bestOutput.value)) {
      records.bestOutput = { value: w.total_work, date: w.start_time, title: w.ride?.title };
    }
    if (w.distance && (!records.bestDistance || w.distance > records.bestDistance.value)) {
      records.bestDistance = { value: w.distance, date: w.start_time, title: w.ride?.title };
    }
    if (w.speed_values && w.speed_values.length > 0) {
      const avg = w.speed_values.reduce((s, v) => s + v, 0) / w.speed_values.length;
      if (!records.bestSpeed || avg > records.bestSpeed.value) {
        records.bestSpeed = { value: avg, date: w.start_time, title: w.ride?.title };
      }
    }
    if (w.calories && (!records.bestCalories || w.calories > records.bestCalories.value)) {
      records.bestCalories = { value: w.calories, date: w.start_time, title: w.ride?.title };
    }
    if (duration > 0 && (!records.bestDuration || duration > records.bestDuration.value)) {
      records.bestDuration = { value: duration, date: w.start_time, title: w.ride?.title };
    }
  });

  return records;
};

// Tread: Estimate critical pace (wraps estimateThresholdSpeed, returns speed + pace)
export const estimateCriticalPace = (workouts) => {
  const speed = estimateThresholdSpeed(workouts);
  if (!speed) return null;
  const paceMinutes = 60 / speed;
  const paceMin = Math.floor(paceMinutes);
  const paceSec = Math.round((paceMinutes - paceMin) * 60);
  return {
    speed: Math.round(speed * 10) / 10,
    pace: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
  };
};

// Tread: Calculate incline stats from incline_values
export const calculateInclineStats = (workouts) => {
  let totalIncline = 0;
  let sampleCount = 0;
  let maxIncline = 0;
  workouts.forEach(w => {
    if (w.incline_values && w.incline_values.length > 0) {
      totalIncline += w.incline_values.reduce((s, v) => s + v, 0);
      sampleCount += w.incline_values.length;
      maxIncline = Math.max(maxIncline, ...w.incline_values);
    }
  });
  if (sampleCount === 0) return null;
  return {
    avg: Math.round((totalIncline / sampleCount) * 10) / 10,
    max: maxIncline,
  };
};

// Tread: Calculate elevation gain from summaries or altitude deltas
export const calculateElevationGain = (workouts) => {
  let totalGain = 0;
  let hasData = false;
  workouts.forEach(w => {
    if (w.elevation_gain && w.elevation_gain > 0) {
      totalGain += w.elevation_gain;
      hasData = true;
    } else if (w.altitude_values && w.altitude_values.length > 1) {
      // Sum positive altitude deltas
      for (let i = 1; i < w.altitude_values.length; i++) {
        const delta = w.altitude_values[i] - w.altitude_values[i - 1];
        if (delta > 0) totalGain += delta;
      }
      hasData = true;
    }
  });
  if (!hasData) return null;
  return Math.round(totalGain);
};

// Bike: Calculate cadence stats from cadence_values
export const calculateCadenceStats = (workouts) => {
  let totalCadence = 0;
  let sampleCount = 0;
  let maxCadence = 0;
  workouts.forEach(w => {
    if (w.cadence_values && w.cadence_values.length > 0) {
      totalCadence += w.cadence_values.reduce((s, v) => s + v, 0);
      sampleCount += w.cadence_values.length;
      maxCadence = Math.max(maxCadence, ...w.cadence_values);
    }
  });
  if (sampleCount === 0) return null;
  return {
    avg: Math.round(totalCadence / sampleCount),
    max: maxCadence,
  };
};

// Bike: Calculate resistance stats from resistance_values
export const calculateResistanceStats = (workouts) => {
  let totalResistance = 0;
  let sampleCount = 0;
  let maxResistance = 0;
  workouts.forEach(w => {
    if (w.resistance_values && w.resistance_values.length > 0) {
      totalResistance += w.resistance_values.reduce((s, v) => s + v, 0);
      sampleCount += w.resistance_values.length;
      maxResistance = Math.max(maxResistance, ...w.resistance_values);
    }
  });
  if (sampleCount === 0) return null;
  return {
    avg: Math.round((totalResistance / sampleCount) * 100), // resistance is 0-1, display as %
    max: Math.round(maxResistance * 100),
  };
};

// Bike: Calculate Variability Index (NP/AP) — Power Ratio
export const calculatePowerRatio = (workouts) => {
  const ratios = [];
  workouts.forEach(w => {
    if (w.output_values && w.output_values.length > 0) {
      const np = calculateNormalizedPower(w.output_values);
      const ap = w.output_values.reduce((s, v) => s + v, 0) / w.output_values.length;
      if (ap > 0) {
        ratios.push(np / ap);
      }
    }
  });
  if (ratios.length === 0) return null;
  const avg = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  return Math.round(avg * 100) / 100;
};

// Row: Estimate rowing FTP (same pattern as cycling FTP but for rowing disciplines)
export const estimateRowingFTP = (workouts) => {
  const ROW_DISCIPLINES = ['rowing', 'caesar'];
  const MIN_DURATION = 20 * 60;

  let bestAvgPower = 0;

  workouts.forEach(w => {
    if (!ROW_DISCIPLINES.includes(w.fitness_discipline)) return;
    const duration = (w.end_time - w.start_time) || 0;
    if (duration < MIN_DURATION) return;

    if (w.output_values && w.output_values.length > 0) {
      const windowSamples = Math.ceil(MIN_DURATION / HR_SAMPLE_SECONDS);
      if (w.output_values.length >= windowSamples) {
        let windowSum = 0;
        for (let j = 0; j < windowSamples; j++) windowSum += w.output_values[j];
        let maxWindowAvg = windowSum / windowSamples;
        for (let j = windowSamples; j < w.output_values.length; j++) {
          windowSum += w.output_values[j] - w.output_values[j - windowSamples];
          maxWindowAvg = Math.max(maxWindowAvg, windowSum / windowSamples);
        }
        bestAvgPower = Math.max(bestAvgPower, maxWindowAvg);
      }
    } else if (w.total_work && duration > 0) {
      const avgPower = w.total_work / duration;
      bestAvgPower = Math.max(bestAvgPower, avgPower);
    }
  });

  return bestAvgPower > 0 ? Math.round(bestAvgPower * 0.95) : null;
};

// Row: Calculate stroke rate stats from stroke_rate_values
export const calculateStrokeStats = (workouts) => {
  let totalRate = 0;
  let sampleCount = 0;
  let maxRate = 0;
  let totalStrokes = 0;
  workouts.forEach(w => {
    if (w.stroke_rate_values && w.stroke_rate_values.length > 0) {
      totalRate += w.stroke_rate_values.reduce((s, v) => s + v, 0);
      sampleCount += w.stroke_rate_values.length;
      maxRate = Math.max(maxRate, ...w.stroke_rate_values);
      // Each sample covers HR_SAMPLE_SECONDS (5s), stroke_rate is strokes/min
      totalStrokes += w.stroke_rate_values.reduce((s, v) => s + (v * HR_SAMPLE_SECONDS / 60), 0);
    }
  });
  if (sampleCount === 0) return null;
  return {
    avgRate: Math.round(totalRate / sampleCount),
    maxRate,
    totalStrokes: Math.round(totalStrokes),
  };
};

// Row: Calculate average output per stroke
export const calculateAvgStrokeOutput = (workouts) => {
  let totalOutput = 0;
  let totalStrokes = 0;
  workouts.forEach(w => {
    if (w.stroke_rate_values && w.stroke_rate_values.length > 0 && w.total_work) {
      totalOutput += w.total_work;
      totalStrokes += w.stroke_rate_values.reduce((s, v) => s + (v * HR_SAMPLE_SECONDS / 60), 0);
    }
  });
  if (totalStrokes === 0) return null;
  return Math.round((totalOutput / totalStrokes) * 10) / 10; // joules per stroke
};

// HR zone distribution using per-datapoint classification from raw HR time series.
// Each hr_values entry represents a 5-second sample (every_n: 5 in the API request).
const HR_SAMPLE_SECONDS = 5;

export const calculateHRZoneBalance = (workouts, hrZones, maxHR) => {
  if (!hrZones || !maxHR || hrZones.length < 4) {
    return null;
  }

  const zones = [
    { name: 'Zone 1', label: 'Warm Up', min: 0, max: hrZones[1], seconds: 0, minutes: 0, color: '#60a5fa' },
    { name: 'Zone 2', label: 'Fat Burn', min: hrZones[1], max: hrZones[2], seconds: 0, minutes: 0, color: '#34d399' },
    { name: 'Zone 3', label: 'Cardio', min: hrZones[2], max: hrZones[3], seconds: 0, minutes: 0, color: '#fbbf24' },
    { name: 'Zone 4', label: 'Peak', min: hrZones[3], max: hrZones[4] || maxHR, seconds: 0, minutes: 0, color: '#f97316' },
    { name: 'Zone 5', label: 'Max', min: hrZones[4] || maxHR, max: maxHR * 1.1, seconds: 0, minutes: 0, color: '#ef4444' },
  ];

  let workoutsWithHR = 0;

  workouts.forEach(w => {
    if (!w.hr_values || w.hr_values.length === 0) return;
    workoutsWithHR++;

    w.hr_values.forEach(hr => {
      for (let i = zones.length - 1; i >= 0; i--) {
        if (hr >= zones[i].min) {
          zones[i].seconds += HR_SAMPLE_SECONDS;
          break;
        }
      }
    });
  });

  zones.forEach(z => {
    z.minutes = Math.round(z.seconds / 60);
  });
  const totalMinutes = zones.reduce((sum, z) => sum + z.minutes, 0);
  zones.forEach(z => {
    z.percentage = totalMinutes > 0 ? Math.round((z.minutes / totalMinutes) * 100) : 0;
  });

  if (workoutsWithHR === 0) return null;
  return { zones, totalMinutes, workoutsWithHR };
};

// Cardio focus breakdown using per-datapoint HR classification.
// Groups time into Low Aerobic (Zone 1-2), High Aerobic (Zone 3), Anaerobic (Zone 4-5).
export const calculateCardioFocus = (workouts, hrZones) => {
  if (!hrZones || hrZones.length < 4) return null;

  // hrZones[2] = Zone 2/3 boundary (~lactate threshold 1)
  // hrZones[3] = Zone 3/4 boundary (~lactate threshold 2)
  const buckets = [
    { name: 'Low Aerobic', label: 'Zone 1–2', min: 0, max: hrZones[2], seconds: 0, minutes: 0, color: '#60a5fa' },
    { name: 'High Aerobic', label: 'Zone 3', min: hrZones[2], max: hrZones[3], seconds: 0, minutes: 0, color: '#34d399' },
    { name: 'Anaerobic', label: 'Zone 4–5', min: hrZones[3], max: Infinity, seconds: 0, minutes: 0, color: '#f97316' },
  ];

  let workoutsWithHR = 0;
  workouts.forEach(w => {
    if (!w.hr_values || w.hr_values.length === 0) return;
    workoutsWithHR++;

    w.hr_values.forEach(hr => {
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (hr >= buckets[i].min) {
          buckets[i].seconds += HR_SAMPLE_SECONDS;
          break;
        }
      }
    });
  });

  buckets.forEach(b => {
    b.minutes = Math.round(b.seconds / 60);
  });
  const totalMinutes = buckets.reduce((sum, b) => sum + b.minutes, 0);
  buckets.forEach(b => {
    b.percentage = totalMinutes > 0 ? Math.round((b.minutes / totalMinutes) * 100) : 0;
  });

  if (workoutsWithHR === 0) return null;
  return { buckets, totalMinutes, workoutsWithHR };
};

// Aggregate workouts into time buckets for chart data
export const aggregateWorkoutsForChart = (workouts, timeframe, metric = 'duration') => {
  if (!workouts) return [];

  const now = new Date();
  let buckets = [];

  if (timeframe === 'Week') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      buckets.push({
        start: date.getTime() / 1000,
        end: date.getTime() / 1000 + 86400,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: 0,
      });
    }
  } else if (timeframe === 'Month') {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      buckets.push({
        start: date.getTime() / 1000,
        end: date.getTime() / 1000 + 86400,
        label: date.getDate().toString(),
        value: 0,
      });
    }
  } else if (timeframe === 'Year') {
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        start: date.getTime() / 1000,
        end: nextMonth.getTime() / 1000,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
      });
    }
  } else {
    // All time - group by month
    if (!workouts.length) return [];
    const oldest = Math.min(...workouts.map(w => w.start_time));
    const oldestDate = new Date(oldest * 1000);
    let current = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1);
    while (current <= now) {
      const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      buckets.push({
        start: current.getTime() / 1000,
        end: next.getTime() / 1000,
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: 0,
      });
      current = next;
    }
  }

  workouts.forEach(w => {
    for (const bucket of buckets) {
      if (w.start_time >= bucket.start && w.start_time < bucket.end) {
        if (metric === 'duration') {
          bucket.value += ((w.end_time - w.start_time) || 0) / 60;
        } else if (metric === 'calories') {
          bucket.value += w.calories || 0;
        } else if (metric === 'count') {
          bucket.value += 1;
        } else if (metric === 'output') {
          bucket.value += w.total_work || 0;
        } else if (metric === 'distance') {
          bucket.value += w.distance || 0;
        }
        break;
      }
    }
  });

  return buckets;
};

// Aggregate average pace or speed per time bucket for chart data
export const aggregateAvgMetricForChart = (workouts, timeframe, metricType = 'speed', disciplineFilter = null) => {
  if (!workouts) return [];

  let filtered = workouts;
  if (disciplineFilter === 'running') {
    filtered = workouts.filter(w => {
      const name = (w.ride?.title || w.title || '').toLowerCase();
      return name.includes('run') && !name.includes('walk');
    });
  } else if (disciplineFilter === 'walking') {
    filtered = workouts.filter(w => {
      const name = (w.ride?.title || w.title || '').toLowerCase();
      return name.includes('walk');
    });
  }

  // Reuse aggregateWorkoutsForChart to create empty buckets via 'count' metric
  const buckets = aggregateWorkoutsForChart(filtered, timeframe, 'count');

  // Accumulate total distance and total time per bucket
  buckets.forEach(b => { b._dist = 0; b._time = 0; b.value = 0; });

  filtered.forEach(w => {
    const dist = w.distance || 0;
    const duration = ((w.end_time - w.start_time) || 0) / 60; // minutes
    if (dist <= 0 || duration <= 0) return;

    for (const bucket of buckets) {
      if (w.start_time >= bucket.start && w.start_time < bucket.end) {
        bucket._dist += dist;
        bucket._time += duration;
        break;
      }
    }
  });

  // Compute final values: pace = total_time / total_distance, speed = total_distance / (total_time / 60)
  buckets.forEach(b => {
    if (b._dist > 0 && b._time > 0) {
      if (metricType === 'pace') {
        b.value = b._time / b._dist; // min per mile
      } else {
        b.value = Math.round((b._dist / (b._time / 60)) * 10) / 10; // mph
      }
    } else {
      b.value = 0;
    }
    delete b._dist;
    delete b._time;
  });

  return buckets;
};

// Helper function to calculate metrics from workout data
export const calculateMetrics = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalCalories: 0,
      totalDistance: 0,
      totalDuration: 0,
      avgOutput: 0,
      workoutsByType: {},
    };
  }

  const metrics = {
    totalWorkouts: workouts.length,
    totalCalories: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalOutput: 0,
    workoutsByType: {},
  };

  workouts.forEach((workout) => {
    metrics.totalCalories += workout.calories || 0;
    metrics.totalDistance += workout.distance || 0;
    metrics.totalDuration += workout.duration || 0;
    metrics.totalOutput += workout.total_work || 0;

    const fitnessType = workout.fitness_discipline || 'Unknown';
    metrics.workoutsByType[fitnessType] =
      (metrics.workoutsByType[fitnessType] || 0) + 1;
  });

  metrics.avgOutput = metrics.totalWorkouts > 0
    ? Math.round(metrics.totalOutput / metrics.totalWorkouts)
    : 0;

  return metrics;
};

// Calculate weekly progress from workouts
export const calculateWeeklyProgress = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      activeDays: 0,
      activeTime: 0,
      totalWorkouts: 0,
    };
  }

  // Get the start of the current week (Monday at 00:00:00)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday

  const mondayStart = new Date(now);
  mondayStart.setDate(now.getDate() - daysFromMonday);
  mondayStart.setHours(0, 0, 0, 0);

  const weekStartTimestamp = mondayStart.getTime() / 1000; // Convert to seconds

  // Filter workouts from Monday onwards
  const weeklyWorkouts = workouts.filter(w => w.start_time >= weekStartTimestamp);

  // Calculate unique active days based on start_time
  const uniqueDays = new Set();
  let totalDuration = 0;

  weeklyWorkouts.forEach(workout => {
    // Use start_time for determining the day
    const date = new Date(workout.start_time * 1000);
    const dayKey = date.toDateString();
    uniqueDays.add(dayKey);

    // Calculate duration from end_time - start_time (in seconds)
    const duration = (workout.end_time - workout.start_time) || 0;
    totalDuration += duration;
  });

  return {
    activeDays: uniqueDays.size,
    activeTime: Math.round(totalDuration / 60), // Convert to minutes
    totalWorkouts: weeklyWorkouts.length,
  };
};

// Calculate historical weekly data for multiple weeks
export const calculateWeeklyHistory = (workouts, weeksBack = 12) => {
  if (!workouts || workouts.length === 0) {
    return [];
  }

  const history = [];
  const now = new Date();

  // Calculate the Monday of the current week first
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - daysFromMonday);
  currentMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < weeksBack; i++) {
    // Calculate each week going back from current Monday
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekStartTimestamp = weekStart.getTime() / 1000;
    const weekEndTimestamp = weekEnd.getTime() / 1000;

    // Filter workouts for this week
    const weekWorkouts = workouts.filter(
      w => w.start_time >= weekStartTimestamp && w.start_time < weekEndTimestamp
    );

    // Calculate metrics for this week
    const uniqueDays = new Set();
    let totalDuration = 0;

    weekWorkouts.forEach(workout => {
      const date = new Date(workout.start_time * 1000);
      uniqueDays.add(date.toDateString());
      totalDuration += (workout.end_time - workout.start_time) || 0;
    });

    history.push({
      weekStart: weekStart,
      weekEnd: new Date(weekEnd.getTime() - 1000), // End is Sunday 23:59:59
      activeDays: uniqueDays.size,
      activeTime: Math.round(totalDuration / 60),
      totalWorkouts: weekWorkouts.length,
    });
  }

  // Log for debugging
  console.log('Weekly history calculated:', history.length, 'weeks');
  console.log('Oldest week:', history[history.length - 1]?.weekStart.toDateString());
  console.log('Total workouts provided:', workouts.length);
  if (workouts.length > 0) {
    const oldestWorkout = new Date(Math.min(...workouts.map(w => w.start_time * 1000)));
    console.log('Oldest workout in data:', oldestWorkout.toDateString());
  }

  return history.reverse(); // Return oldest to newest
};

// --- Strength Metrics Calculation Functions ---

// Muscle group → body region mapping
const MUSCLE_GROUP_CATEGORIES = {
  upper: ['biceps', 'triceps', 'shoulders', 'chest', 'lats', 'mid_back', 'traps', 'forearms'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'hips'],
  core: ['core', 'obliques', 'low_back'],
};

// Extract max weight from a weight_info_summary_data object
// Structure: { light_weights, medium_weights, heavy_weights, other_weights }
// Each is null or an array of { weight_value, weight_unit }
const extractMaxWeight = (weightInfoSummary) => {
  if (!weightInfoSummary) return 0;
  let max = 0;
  for (const category of ['light_weights', 'medium_weights', 'heavy_weights', 'other_weights']) {
    const weights = weightInfoSummary[category];
    if (Array.isArray(weights)) {
      weights.forEach(w => {
        if (w.weight_value && w.weight_value > max) max = w.weight_value;
      });
    }
  }
  return max;
};

// Calculate aggregate strength metrics from enriched strength workouts
export const calculateStrengthMetrics = (workouts) => {
  let totalVolume = 0;
  let totalReps = 0;
  let workoutsWithData = 0;
  const byMovement = {};
  const muscleGroups = {};
  let muscleGroupWorkouts = 0;

  workouts.forEach(w => {
    const mtd = w.movement_tracker_data;
    if (mtd && mtd.completed_movements_summary_data) {
      workoutsWithData++;
      const summary = mtd.completed_movements_summary_data;
      totalVolume += summary.total_volume || 0;
      totalReps += summary.total_repetitions || 0;

      // Per-movement aggregation
      if (summary.movement_aggregate_data) {
        summary.movement_aggregate_data.forEach(movement => {
          const name = movement.movement_name;
          if (!name) return;
          if (!byMovement[name]) {
            byMovement[name] = { totalVolume: 0, totalReps: 0, maxWeight: 0, sessions: 0 };
          }
          byMovement[name].sessions++;

          // Stats use completed_number, not value
          if (movement.stats) {
            const volStat = movement.stats.find(s => s.slug === 'total_volume');
            if (volStat) byMovement[name].totalVolume += volStat.completed_number || 0;
            const repStat = movement.stats.find(s => s.slug === 'total_reps');
            if (repStat) byMovement[name].totalReps += repStat.completed_number || 0;
          }

          // Track max weight from weight_info_summary_data
          // Structure: { light_weights, medium_weights, heavy_weights, other_weights }
          const maxWt = extractMaxWeight(movement.weight_info_summary_data);
          if (maxWt > byMovement[name].maxWeight) {
            byMovement[name].maxWeight = maxWt;
          }
        });
      }
    }

    // Muscle group score aggregation
    if (w.muscle_group_score && w.muscle_group_score.length > 0) {
      muscleGroupWorkouts++;
      w.muscle_group_score.forEach(mg => {
        const group = mg.muscle_group;
        if (!group) return;
        muscleGroups[group] = (muscleGroups[group] || 0) + (mg.score || 0);
      });
    }
  });

  // Calculate strength balance (upper/lower/core) from muscle group scores
  const balance = { upper: 0, lower: 0, core: 0 };
  let balanceTotal = 0;
  Object.entries(muscleGroups).forEach(([group, score]) => {
    for (const [category, groups] of Object.entries(MUSCLE_GROUP_CATEGORIES)) {
      if (groups.includes(group)) {
        balance[category] += score;
        balanceTotal += score;
        break;
      }
    }
  });

  if (balanceTotal > 0) {
    balance.upper = Math.round((balance.upper / balanceTotal) * 100);
    balance.lower = Math.round((balance.lower / balanceTotal) * 100);
    balance.core = Math.round((balance.core / balanceTotal) * 100);
  }

  return {
    totalVolume,
    totalReps,
    workoutsWithData,
    byMovement,
    balance,
    muscleGroups,
    muscleGroupWorkouts,
  };
};

// Estimate 1RM and 10RM per movement using Epley formula: e1RM = weight × (1 + reps/30)
// Then derive 10RM = e1RM / (1 + 10/30)
// Uses repetition_summary_data[] for per-set weight/reps data.
// Each set has: movement_name, completed_reps, weight[].weight_data.weight_value
export const estimateMovement10RM = (workouts) => {
  const results = {};

  workouts.forEach(w => {
    const mtd = w.movement_tracker_data;
    if (!mtd || !mtd.completed_movements_summary_data) return;
    const sets = mtd.completed_movements_summary_data.repetition_summary_data;
    if (!sets) return;

    sets.forEach(set => {
      const name = set.movement_name;
      if (!name) return;

      const reps = set.completed_reps || 0;
      if (reps <= 0) return;

      // Extract weight from set.weight[].weight_data.weight_value
      let maxSetWeight = 0;
      if (Array.isArray(set.weight)) {
        set.weight.forEach(wEntry => {
          const wv = wEntry?.weight_data?.weight_value || 0;
          if (wv > maxSetWeight) maxSetWeight = wv;
        });
      }
      if (maxSetWeight <= 0) return;

      // Epley formula
      const e1RM = maxSetWeight * (1 + reps / 30);
      const est10RM = e1RM / (1 + 10 / 30);

      if (!results[name] || e1RM > results[name].e1RM) {
        results[name] = {
          e1RM: Math.round(e1RM * 10) / 10,
          est10RM: Math.round(est10RM * 10) / 10,
          bestWeight: maxSetWeight,
          bestReps: reps,
        };
      }
    });
  });

  return results;
};

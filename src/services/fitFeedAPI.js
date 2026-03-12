import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

// Peloton and fit-feed share the same auth.onepeloton.com OIDC provider,
// so the Peloton Bearer token is accepted by fit-feed directly.
const getFitFeedToken = () =>
  localStorage.getItem('peloton_token');

// ─── Date helpers ──────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

const authGet = (path, token) =>
  axios
    .get(`${FIT_FEED_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.data)
    .catch(() => null);

const toArr = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

// 7-day numeric average for a field across an array; returns null if no values
const avg7 = (arr, field) => {
  const vals = arr.map((d) => d?.[field]).filter((v) => v != null && !isNaN(Number(v)));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + Number(b), 0) / vals.length;
};

// 7-day average of a nested key inside sleep_levels_map (Garmin); values in seconds → minutes
const avgLevelMins = (arr, key) => {
  const vals = arr
    .map((d) => d?.sleep_levels_map?.[key] ?? d?.sleep_levels_map?.[key + 'Sleep'])
    .filter((v) => v != null && !isNaN(Number(v)));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length / 60);
};

// Convert average ms to whole minutes
const avgMsToMins = (arr, field) => {
  const v = avg7(arr, field);
  return v != null ? Math.round(v / 60_000) : null;
};

// Format minutes as "Xh Ym"
const minsToHM = (mins) => {
  if (mins == null || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Celsius → Fahrenheit (1 decimal)
const cToF = (c) => (c != null ? Math.round(c * 9 / 5 * 10 + 320) / 10 : null);

// ─── Normalisers ───────────────────────────────────────────────────────────────

const normaliseWhoop = (recoveryArr, sleepArr) => {
  const rec0 = recoveryArr[0] ?? null;

  const lightMins = avgMsToMins(sleepArr, 'total_light_sleep_time_milli');
  const remMins   = avgMsToMins(sleepArr, 'total_rem_sleep_time_milli');
  const deepMins  = avgMsToMins(sleepArr, 'total_slow_wave_sleep_time_milli');
  const awakeMins = avgMsToMins(sleepArr, 'total_awake_time_milli');
  const totalMins =
    lightMins != null && remMins != null && deepMins != null
      ? lightMins + remMins + deepMins
      : null;

  const effAvg = avg7(sleepArr, 'sleep_efficiency_percentage');

  return {
    platform: 'whoop',
    displayName: 'Whoop',

    // Vitals — 7-day averages
    vo2_max: null,
    resting_heart_rate: (() => { const v = avg7(recoveryArr, 'resting_heart_rate'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    hr_recovery: null,
    hrv: (() => { const v = avg7(recoveryArr, 'hrv_rmssd_milli'); return v != null ? Math.round(v) : null; })(),
    weight: null,
    muscle_mass: null,
    blood_oxygen: (() => { const v = avg7(recoveryArr, 'spo2_percentage'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    respiratory_rate: (() => { const v = avg7(sleepArr, 'respiratory_rate'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    cycle_phase: rec0?.tags?.find?.((t) => t?.toLowerCase?.().includes('cycle')) ?? null,
    body_temperature: cToF(rec0?.skin_temp_celsius),

    // Sleep — all 7-day averages
    sleep_score:        (() => { const v = avg7(sleepArr, 'sleep_performance_percentage'); return v != null ? Math.round(v) : null; })(),
    sleep_duration:     minsToHM(totalMins),
    sleep_duration_mins: totalMins,
    sleep_light_mins:   lightMins,
    sleep_rem_mins:     remMins,
    sleep_deep_mins:    deepMins,
    sleep_awake_mins:   awakeMins,
    sleep_efficiency:   effAvg != null ? Math.round(effAvg) : null,
    sleep_consistency:  (() => { const v = avg7(sleepArr, 'sleep_consistency_percentage'); return v != null ? Math.round(v) : null; })(),
    sleep_disturbances: (() => { const v = avg7(sleepArr, 'disturbance_count'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    sleep_cycles:       (() => { const v = avg7(sleepArr, 'sleep_cycle_count'); return v != null ? Math.round(v * 10) / 10 : null; })(),

    // Nutrition — not in fit-feed
    hydration_ml: null,
    macros: null,

    raw_sleep: sleepArr,
    raw_recovery: recoveryArr,
  };
};

const normaliseGarmin = (sleepArr, recoveryArr) => {
  const lightMins = avgLevelMins(sleepArr, 'light');
  const remMins   = avgLevelMins(sleepArr, 'rem');
  const deepMins  = avgLevelMins(sleepArr, 'deep');
  const awakeMins = avgLevelMins(sleepArr, 'awake');
  const totalMins =
    lightMins != null && remMins != null && deepMins != null
      ? lightMins + remMins + deepMins
      : null;

  return {
    platform: 'garmin',
    displayName: 'Garmin',

    vo2_max: (() => { const v = avg7(sleepArr, 'vo2_max_precise') ?? avg7(recoveryArr, 'vo2_max_value'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    resting_heart_rate: (() => { const v = avg7(recoveryArr, 'resting_heart_rate') ?? avg7(sleepArr, 'average_heart_rate'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    hr_recovery: null,
    hrv: (() => { const v = avg7(sleepArr, 'average_hrv_value') ?? avg7(recoveryArr, 'last_night_avg_hrv'); return v != null ? Math.round(v) : null; })(),
    weight: null,
    muscle_mass: null,
    blood_oxygen: (() => { const v = avg7(sleepArr, 'average_spo2_value'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    respiratory_rate: (() => { const v = avg7(sleepArr, 'average_respiration_value'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    cycle_phase: null,
    body_temperature: null,

    sleep_score:        (() => { const v = avg7(sleepArr, 'overall_sleep_score'); return v != null ? Math.round(v) : null; })(),
    sleep_duration:     minsToHM(totalMins),
    sleep_duration_mins: totalMins,
    sleep_light_mins:   lightMins,
    sleep_rem_mins:     remMins,
    sleep_deep_mins:    deepMins,
    sleep_awake_mins:   awakeMins,
    sleep_efficiency:   null,
    sleep_consistency:  null,
    sleep_disturbances: (() => { const v = avg7(sleepArr, 'awake_count') ?? avg7(sleepArr, 'awakenings'); return v != null ? Math.round(v * 10) / 10 : null; })(),
    sleep_cycles:       (() => { const v = avg7(sleepArr, 'sleep_cycle_count'); return v != null ? Math.round(v * 10) / 10 : null; })(),

    hydration_ml: null,
    macros: null,

    raw_sleep: sleepArr,
    raw_recovery: recoveryArr,
  };
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches biology data from PeloHub for a given Peloton user ID.
 * All sleep and biometric values are 7-day averages over the last 7 days.
 * Tries Whoop first, then Garmin. NEVER throws.
 *
 * @param {string} userId - Peloton user ID
 */
export const getPeloHubBioData = async (userId) => {
  const NULL_RESULT = {
    platform: null, displayName: null,
    vo2_max: null, resting_heart_rate: null, hr_recovery: null, hrv: null,
    weight: null, muscle_mass: null, blood_oxygen: null, respiratory_rate: null,
    cycle_phase: null, body_temperature: null,
    sleep_score: null, sleep_duration: null, sleep_duration_mins: null,
    sleep_light_mins: null, sleep_rem_mins: null, sleep_deep_mins: null, sleep_awake_mins: null,
    sleep_efficiency: null, sleep_consistency: null, sleep_disturbances: null, sleep_cycles: null,
    hydration_ml: null, macros: null,
    raw_sleep: null, raw_recovery: null,
  };

  const token = getFitFeedToken();
  if (!token || !userId) return NULL_RESULT;

  const end   = fmtDate(new Date());
  const start = fmtDate(getWeekStart());
  const q     = `?start=${start}&end=${end}`;

  const [whoopRecovery, whoopSleep] = await Promise.all([
    authGet(`/whoop/api/recovery/${userId}${q}`, token),
    authGet(`/whoop/api/sleep/${userId}${q}`, token),
  ]);
  if (whoopRecovery || whoopSleep) {
    return normaliseWhoop(toArr(whoopRecovery), toArr(whoopSleep));
  }

  const [garminSleep, garminRecovery] = await Promise.all([
    authGet(`/garmin/api/sleep/${userId}${q}`, token),
    authGet(`/garmin/api/recovery/${userId}${q}`, token),
  ]);
  if (garminSleep || garminRecovery) {
    return normaliseGarmin(toArr(garminSleep), toArr(garminRecovery));
  }

  return NULL_RESULT;
};

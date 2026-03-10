import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

const getFitFeedToken = () => localStorage.getItem('fitfeed_token');

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

// Normalise to array (some endpoints return object, some return array)
const toArr = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

// 7-day numeric average for a field across an array; rounds to 1 decimal
const avg7 = (arr, field) => {
  const vals = arr.map((d) => d?.[field]).filter((v) => v != null && !isNaN(Number(v)));
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + Number(b), 0) / vals.length;
  return Math.round(mean * 10) / 10;
};

// Most-recent (index 0) entry from the array
const latest = (arr) => arr[0] ?? null;

// ms → "Xh Ym" string (returns null if no value)
const msToHM = (ms) => {
  if (ms == null || ms <= 0) return null;
  const totalMins = Math.round(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Celsius → Fahrenheit (1 decimal)
const cToF = (c) => (c != null ? Math.round(c * 9 / 5 * 10 + 320) / 10 : null);

// ─── Normalisers ───────────────────────────────────────────────────────────────

const normaliseWhoop = (recoveryArr, sleepArr) => {
  const rec = latest(recoveryArr);
  const slp = latest(sleepArr);

  // Garmin-style sleep_levels_map isn't in Whoop — stages come as dedicated ms fields
  const lightMs = slp?.total_light_sleep_time_milli ?? null;
  const remMs   = slp?.total_rem_sleep_time_milli   ?? null;
  const deepMs  = slp?.total_slow_wave_sleep_time_milli ?? null;
  const awakeMs = slp?.total_awake_time_milli ?? null;
  const totalSleepMs =
    lightMs != null && remMs != null && deepMs != null
      ? lightMs + remMs + deepMs
      : null;

  return {
    platform: 'whoop',
    displayName: 'Whoop',

    // Biometrics — 7-day averages for stable metrics
    vo2_max: null, // not exposed by fit-feed
    resting_heart_rate: avg7(recoveryArr, 'resting_heart_rate'),
    hr_recovery: null, // passive monitoring only; not available
    hrv: (() => {
      const v = avg7(recoveryArr, 'hrv_rmssd_milli');
      return v != null ? Math.round(v) : null;
    })(),
    weight: null, // not in fit-feed
    muscle_mass: null,
    blood_oxygen: avg7(recoveryArr, 'spo2_percentage'),
    respiratory_rate: avg7(sleepArr, 'respiratory_rate'),
    cycle_phase: rec?.tags?.find?.((t) => t?.toLowerCase?.().includes('cycle')) ?? null,
    body_temperature: cToF(rec?.skin_temp_celsius),

    // Sleep — most recent night
    sleep_score: slp?.sleep_performance_percentage ?? null,
    sleep_duration: msToHM(totalSleepMs),
    sleep_duration_mins: totalSleepMs != null ? Math.round(totalSleepMs / 60_000) : null,
    sleep_light: msToHM(lightMs),
    sleep_rem: msToHM(remMs),
    sleep_deep: msToHM(deepMs),
    sleep_awake: msToHM(awakeMs),
    sleep_efficiency: slp?.sleep_efficiency_percentage ?? null,
    sleep_consistency: slp?.sleep_consistency_percentage ?? null,
    sleep_disturbances: slp?.disturbance_count ?? null,
    sleep_cycles: slp?.sleep_cycle_count ?? null,

    // Nutrition — not available from Whoop via fit-feed
    hydration_ml: null,
    macros: null,

    raw_sleep: sleepArr,
    raw_recovery: recoveryArr,
  };
};

const normaliseGarmin = (sleepArr, recoveryArr) => {
  const slp = latest(sleepArr);
  const rec = latest(recoveryArr);

  // Garmin sleep stages live in sleep_levels_map (values in seconds)
  const lvl = slp?.sleep_levels_map ?? {};
  const lightS = lvl.light ?? lvl.lightSleep ?? null;
  const remS   = lvl.rem   ?? lvl.remSleep   ?? null;
  const deepS  = lvl.deep  ?? lvl.deepSleep  ?? null;
  const awakeS = lvl.awake ?? null;

  const secToMs = (s) => (s != null ? s * 1_000 : null);

  return {
    platform: 'garmin',
    displayName: 'Garmin',

    vo2_max: slp?.vo2_max_precise ?? rec?.vo2_max_value ?? null,
    resting_heart_rate: avg7(recoveryArr, 'resting_heart_rate') ?? avg7(sleepArr, 'average_heart_rate'),
    hr_recovery: null,
    hrv: avg7(sleepArr, 'average_hrv_value') ?? avg7(recoveryArr, 'last_night_avg_hrv'),
    weight: null,
    muscle_mass: null,
    blood_oxygen: avg7(sleepArr, 'average_spo2_value'),
    respiratory_rate: avg7(sleepArr, 'average_respiration_value'),
    cycle_phase: null,
    body_temperature: null, // Garmin skin temp not exposed in these endpoints

    sleep_score: slp?.overall_sleep_score ?? null,
    sleep_duration: msToHM(secToMs(lightS != null && remS != null && deepS != null ? lightS + remS + deepS : null)),
    sleep_duration_mins: lightS != null && remS != null && deepS != null
      ? Math.round((lightS + remS + deepS) / 60) : null,
    sleep_light: msToHM(secToMs(lightS)),
    sleep_rem: msToHM(secToMs(remS)),
    sleep_deep: msToHM(secToMs(deepS)),
    sleep_awake: msToHM(secToMs(awakeS)),
    sleep_efficiency: null, // not a standard Garmin Connect field in this endpoint
    sleep_consistency: null,
    sleep_disturbances: lvl.awakenings ?? slp?.awake_count ?? null,
    sleep_cycles: slp?.sleep_cycle_count ?? null,

    hydration_ml: null,
    macros: null,

    raw_sleep: sleepArr,
    raw_recovery: recoveryArr,
  };
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches biology data from PeloHub for a given Peloton user ID.
 *
 * Hits real data endpoints (not /v2/check):
 *   /fit-feed/whoop/api/recovery/<userId>?start=YYYY-MM-DD&end=YYYY-MM-DD
 *   /fit-feed/whoop/api/sleep/<userId>?start=YYYY-MM-DD&end=YYYY-MM-DD
 *   /fit-feed/garmin/api/sleep/<userId>?start=YYYY-MM-DD&end=YYYY-MM-DD
 *   /fit-feed/garmin/api/recovery/<userId>?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Date range: last 7 days. Returns 7-day averages for stable biometrics
 * (HRV, RHR, respiratory rate) and most-recent values for daily readings
 * (sleep score, stages, recovery score).
 *
 * NEVER throws — always returns a safe NULL_RESULT object.
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
    sleep_light: null, sleep_rem: null, sleep_deep: null, sleep_awake: null,
    sleep_efficiency: null, sleep_consistency: null, sleep_disturbances: null, sleep_cycles: null,
    hydration_ml: null, macros: null,
    raw_sleep: null, raw_recovery: null,
  };

  const token = getFitFeedToken();
  if (!token || !userId) return NULL_RESULT;

  const end   = fmtDate(new Date());
  const start = fmtDate(getWeekStart());
  const q     = `?start=${start}&end=${end}`;

  // Try Whoop first (parallel requests)
  const [whoopRecovery, whoopSleep] = await Promise.all([
    authGet(`/whoop/api/recovery/${userId}${q}`, token),
    authGet(`/whoop/api/sleep/${userId}${q}`, token),
  ]);
  if (whoopRecovery || whoopSleep) {
    return normaliseWhoop(toArr(whoopRecovery), toArr(whoopSleep));
  }

  // Fall back to Garmin
  const [garminSleep, garminRecovery] = await Promise.all([
    authGet(`/garmin/api/sleep/${userId}${q}`, token),
    authGet(`/garmin/api/recovery/${userId}${q}`, token),
  ]);
  if (garminSleep || garminRecovery) {
    return normaliseGarmin(toArr(garminSleep), toArr(garminRecovery));
  }

  return NULL_RESULT;
};

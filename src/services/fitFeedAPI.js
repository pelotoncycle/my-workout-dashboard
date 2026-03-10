import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

const getFitFeedToken = () => localStorage.getItem('fitfeed_token');

// Format date as YYYY-MM-DD (matches PeloHub's fmtDate)
const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Fire an authenticated GET; returns parsed JSON or null on any failure
const authGet = (path, token) =>
  axios
    .get(`${FIT_FEED_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.data)
    .catch(() => null);

// Most-recent entry from an array response, or the object itself
const latest = (data) => (Array.isArray(data) ? data[0] ?? null : data);

/**
 * Fetches biology data from PeloHub for a given Peloton user ID.
 *
 * Endpoint pattern:  /fit-feed/<platform>/api/<type>/<userId>?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Platforms tried:   whoop -> garmin (first platform with data wins)
 *
 * NEVER throws -- always returns a safe object so callers need no try/catch.
 *
 * @param {string} userId - Peloton user ID (e.g. from /api/me or member search)
 * @returns {{ platform, displayName, sleep_score, recovery_score, hrv, resting_heart_rate, raw_sleep, raw_recovery }}
 */
export const getPeloHubBioData = async (userId) => {
  const NULL_RESULT = {
    platform: null,
    displayName: null,
    sleep_score: null,
    recovery_score: null,
    hrv: null,
    resting_heart_rate: null,
    raw_sleep: null,
    raw_recovery: null,
  };

  const token = getFitFeedToken();
  if (!token || !userId) return NULL_RESULT;

  const end = fmtDate(new Date());
  const start = fmtDate(getWeekStart());
  const q = `?start=${start}&end=${end}`;

  // --- Whoop ---
  const [whoopRecovery, whoopSleep] = await Promise.all([
    authGet(`/whoop/api/recovery/${userId}${q}`, token),
    authGet(`/whoop/api/sleep/${userId}${q}`, token),
  ]);

  if (whoopRecovery || whoopSleep) {
    const rec = latest(whoopRecovery);
    const slp = latest(whoopSleep);
    return {
      platform: 'whoop',
      displayName: 'Whoop',
      // sleep_performance_percentage is Whoop's primary sleep quality score (0-100)
      sleep_score: slp?.sleep_performance_percentage ?? null,
      recovery_score: rec?.recovery_score ?? null,
      // hrv_rmssd_milli is already in ms
      hrv: rec?.hrv_rmssd_milli != null ? Math.round(rec.hrv_rmssd_milli) : null,
      resting_heart_rate: rec?.resting_heart_rate ?? null,
      raw_sleep: whoopSleep,
      raw_recovery: whoopRecovery,
    };
  }

  // --- Garmin ---
  const [garminSleep, garminRecovery] = await Promise.all([
    authGet(`/garmin/api/sleep/${userId}${q}`, token),
    authGet(`/garmin/api/recovery/${userId}${q}`, token),
  ]);

  if (garminSleep || garminRecovery) {
    const slp = latest(garminSleep);
    const rec = latest(garminRecovery);
    return {
      platform: 'garmin',
      displayName: 'Garmin',
      sleep_score: slp?.overall_sleep_score ?? null,
      recovery_score: rec?.recovery_score ?? slp?.body_battery_charged_value ?? null,
      hrv: slp?.average_hrv_value ?? rec?.last_night_avg_hrv ?? null,
      resting_heart_rate: rec?.resting_heart_rate ?? slp?.average_respiration_value ?? null,
      raw_sleep: garminSleep,
      raw_recovery: garminRecovery,
    };
  }

  return NULL_RESULT;
};

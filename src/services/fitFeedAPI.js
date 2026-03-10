import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

export const PLATFORM_DISPLAY_NAMES = {
  whoop: 'WHOOP',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  oura: 'Oura Ring',
};

/**
 * Calls POST /fit-feed/check with the user's bearer token.
 * Returns which third-party platform (if any) is connected.
 *
 * @returns {{ connectedPlatform: string|null, displayName: string|null }}
 */
export const getConnectedDevice = async (authToken) => {
  const response = await axios.post(
    `${FIT_FEED_BASE}/check`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  const { enabledIntegrations = {} } = response.data;
  const connectedPlatform =
    Object.keys(enabledIntegrations).find((k) => enabledIntegrations[k]) || null;
  return {
    connectedPlatform,
    displayName: connectedPlatform
      ? (PLATFORM_DISPLAY_NAMES[connectedPlatform] ?? connectedPlatform)
      : null,
  };
};

/**
 * Calls GET /fit-feed/v2/check?platform=X with the user's bearer token.
 * Returns raw health/activity data from the connected device.
 *
 * @param {string} authToken
 * @param {string} platform  e.g. 'whoop', 'garmin', 'fitbit', 'oura'
 * @returns {object} raw response data
 */
export const getDeviceMetrics = async (authToken, platform) => {
  const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
    params: { platform },
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
};

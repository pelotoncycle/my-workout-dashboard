import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

export const PLATFORM_DISPLAY_NAMES = {
  whoop: 'WHOOP',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  oura: 'Oura Ring',
};

const getFitFeedToken = () => localStorage.getItem('fitfeed_token');

/**
 * Calls POST /fit-feed/check with the fit-feed Auth0 token.
 * Returns which third-party platform (if any) is connected.
 */
export const getConnectedDevice = async () => {
  const token = getFitFeedToken();
  if (!token) throw new Error('No fit-feed token');
  const response = await axios.post(
    `${FIT_FEED_BASE}/check`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
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
 * Calls GET /fit-feed/v2/check?platform=X with the fit-feed Auth0 token.
 * Returns raw health/activity data from the connected device.
 */
export const getDeviceMetrics = async (platform) => {
  const token = getFitFeedToken();
  if (!token) throw new Error('No fit-feed token');
  const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
    params: { platform },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

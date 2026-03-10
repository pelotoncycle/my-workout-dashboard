import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

// Only garmin and fitbit are supported by the /v2/check endpoint
export const PLATFORM_DISPLAY_NAMES = {
  garmin: 'Garmin',
  fitbit: 'Fitbit',
};

const SUPPORTED_PLATFORMS = ['garmin', 'fitbit'];

const getFitFeedToken = () => localStorage.getItem('fitfeed_token');

/**
 * Discovers which platform is connected by probing each supported platform
 * directly via GET /v2/check?platform=X.
 * (POST /check requires alpha enrollment and is skipped.)
 *
 * @returns {{ connectedPlatform: string|null, displayName: string|null, data: object|null }}
 */
export const getConnectedDevice = async () => {
  const token = getFitFeedToken();
  if (!token) throw new Error('No fit-feed token');

  for (const platform of SUPPORTED_PLATFORMS) {
    try {
      const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
        params: { platform },
        headers: { Authorization: `Bearer ${token}` },
      });
      // A response without an error field means this platform is connected
      if (response.data && !response.data.error) {
        return {
          connectedPlatform: platform,
          displayName: PLATFORM_DISPLAY_NAMES[platform] ?? platform,
          data: response.data,
        };
      }
    } catch (err) {
      // 4xx = not connected — try next platform
    }
  }

  return { connectedPlatform: null, displayName: null, data: null };
};

/**
 * Returns raw health/activity data for a specific connected platform.
 * Pass existingData (from getConnectedDevice) to avoid a duplicate request.
 */
export const getDeviceMetrics = async (platform, existingData = null) => {
  if (existingData) return existingData;
  const token = getFitFeedToken();
  if (!token) throw new Error('No fit-feed token');
  const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
    params: { platform },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

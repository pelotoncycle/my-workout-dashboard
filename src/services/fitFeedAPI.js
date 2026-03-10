import axios from 'axios';

const FIT_FEED_BASE = '/fit-feed';

// All platforms confirmed to exist on /v2/check (return 401 when unauthenticated)
export const PLATFORM_DISPLAY_NAMES = {
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  whoop: 'Whoop',
  oura: 'Oura Ring',
  apple_health: 'Apple Health',
  polar: 'Polar',
};

const SUPPORTED_PLATFORMS = ['garmin', 'fitbit', 'whoop', 'oura', 'apple_health', 'polar'];

const getFitFeedToken = () => localStorage.getItem('fitfeed_token');

/**
 * Discovers which platform is connected by probing each supported platform.
 * NEVER throws — always returns a safe object so callers need no try/catch.
 *
 * @returns {{ connectedPlatform: string|null, displayName: string|null, data: object|null }}
 */
export const getConnectedDevice = async () => {
  const token = getFitFeedToken();
  // No token stored — silently report no connection
  if (!token) return { connectedPlatform: null, displayName: null, data: null };

  for (const platform of SUPPORTED_PLATFORMS) {
    try {
      const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
        params: { platform },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && !response.data.error) {
        return {
          connectedPlatform: platform,
          displayName: PLATFORM_DISPLAY_NAMES[platform] ?? platform,
          data: response.data,
        };
      }
    } catch (_) {
      // 4xx / network error = not connected on this platform, try next
    }
  }

  return { connectedPlatform: null, displayName: null, data: null };
};

/**
 * Returns raw health/activity data for a specific connected platform.
 * Pass existingData (from getConnectedDevice) to avoid a duplicate request.
 * NEVER throws — returns null on any failure.
 */
export const getDeviceMetrics = async (platform, existingData = null) => {
  if (existingData) return existingData;
  const token = getFitFeedToken();
  if (!token) return null;
  try {
    const response = await axios.get(`${FIT_FEED_BASE}/v2/check`, {
      params: { platform },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data ?? null;
  } catch (_) {
    return null;
  }
};

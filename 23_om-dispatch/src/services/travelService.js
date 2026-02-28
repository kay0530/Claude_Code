import { APP_DEFAULTS } from '../data/defaults';

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians.
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate travel time in minutes based on distance.
 * @param {number} distance - Distance in km
 * @param {object} settings - App settings with roadCorrectionFactor and averageSpeedKmh
 * @returns {number} Estimated travel time in minutes
 */
export function estimateTravelMinutes(distance, settings = APP_DEFAULTS) {
  const correctionFactor = settings.roadCorrectionFactor || APP_DEFAULTS.roadCorrectionFactor;
  const avgSpeed = settings.averageSpeedKmh || APP_DEFAULTS.averageSpeedKmh;

  const correctedDistance = distance * correctionFactor;
  const hours = correctedDistance / avgSpeed;
  return Math.round(hours * 60);
}

/**
 * Check if accommodation is needed based on travel time and work end time.
 * @param {number} travelMinutes - One-way travel time in minutes
 * @param {string} workEndTime - Expected work end time in HH:MM format
 * @param {object} settings - App settings with accommodation thresholds
 * @returns {{ needed: boolean, reason: string }}
 */
export function checkAccommodationNeeded(travelMinutes, workEndTime, settings = APP_DEFAULTS) {
  const threshold = settings.accommodationThreshold || APP_DEFAULTS.accommodationThreshold;
  const travelThreshold = threshold.travelMinutes || 180;
  const returnTimeLimit = threshold.returnTimeLimit || '20:00';

  // Check if travel exceeds threshold
  if (travelMinutes > travelThreshold) {
    return {
      needed: true,
      reason: `片道${travelMinutes}分（${Math.round(travelMinutes / 60 * 10) / 10}時間）: 移動時間が${travelThreshold}分を超過`,
    };
  }

  // Check if return time exceeds limit
  if (workEndTime) {
    const [endH, endM] = workEndTime.split(':').map(Number);
    const returnMinutes = endH * 60 + endM + travelMinutes;
    const [limitH, limitM] = returnTimeLimit.split(':').map(Number);
    const limitMinutes = limitH * 60 + limitM;

    if (returnMinutes > limitMinutes) {
      const returnH = Math.floor(returnMinutes / 60);
      const returnM = returnMinutes % 60;
      return {
        needed: true,
        reason: `帰着${String(returnH).padStart(2, '0')}:${String(returnM).padStart(2, '0')}予定: ${returnTimeLimit}を超過`,
      };
    }
  }

  return { needed: false, reason: '' };
}

/**
 * Calculate departure time by subtracting travel time from work start time.
 * @param {number} travelMinutes - One-way travel time in minutes
 * @param {string} workStartTime - Work start time in HH:MM format
 * @returns {{ departureTime: string, isEarlyDeparture: boolean, warning: string }}
 */
export function calculateDepartureTime(travelMinutes, workStartTime) {
  const earliestDeparture = APP_DEFAULTS.earliestDeparture || '06:00';

  const [startH, startM] = workStartTime.split(':').map(Number);
  const startTotalMinutes = startH * 60 + startM;

  const departureTotalMinutes = startTotalMinutes - travelMinutes;

  const [earliestH, earliestM] = earliestDeparture.split(':').map(Number);
  const earliestTotalMinutes = earliestH * 60 + earliestM;

  const departureH = Math.floor(departureTotalMinutes / 60);
  const departureM = departureTotalMinutes % 60;
  const departureTime = `${String(Math.max(0, departureH)).padStart(2, '0')}:${String(Math.max(0, departureM)).padStart(2, '0')}`;

  const isEarlyDeparture = departureTotalMinutes < earliestTotalMinutes;

  let warning = '';
  if (isEarlyDeparture) {
    warning = `出発時刻${departureTime}は最早出発時刻${earliestDeparture}より早いため、前日移動または宿泊を検討してください`;
  }

  return {
    departureTime,
    isEarlyDeparture,
    warning,
  };
}

/**
 * Calculate full travel info for a job from the base location.
 * @param {object} job - Job with latitude, longitude
 * @param {object} settings - App settings with baseLocation
 * @returns {object} Travel information
 */
export function calculateTravelInfo(job, settings = APP_DEFAULTS) {
  if (!job.latitude || !job.longitude || !settings.baseLocation) {
    return {
      distance: null,
      travelMinutes: null,
      accommodationNeeded: false,
      departureTime: null,
    };
  }

  const distance = calculateDistance(
    settings.baseLocation.latitude,
    settings.baseLocation.longitude,
    job.latitude,
    job.longitude
  );

  const travelMinutes = estimateTravelMinutes(distance, settings);

  const workStartTime = settings.workingHours?.start || '09:00';
  const workEndTimeMinutes =
    timeToMinutes(workStartTime) + (job.estimatedTimeHours || 8) * 60;
  const workEndTime = minutesToTime(workEndTimeMinutes);

  const accommodation = checkAccommodationNeeded(travelMinutes, workEndTime, settings);
  const departure = calculateDepartureTime(travelMinutes, workStartTime);

  return {
    distance: Math.round(distance * 10) / 10,
    travelMinutes,
    accommodationNeeded: accommodation.needed,
    accommodationReason: accommodation.reason,
    departureTime: departure.departureTime,
    isEarlyDeparture: departure.isEarlyDeparture,
    departureWarning: departure.warning,
  };
}

/**
 * Convert HH:MM string to total minutes.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes to HH:MM string.
 */
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const APP_DEFAULTS = {
  workingHours: {
    start: '09:00',
    end: '18:00',
    extendedStart: '08:00',
    extendedEnd: '19:00',
  },
  earliestDeparture: '06:00',
  latestWorkStart: '10:00',
  stretchMode: {
    enabled: true,
    defaultMultiplier: 1.2,
    maxMultiplier: 1.5,
  },
  baseLocation: {
    name: '立川事業所',
    address: '東京都立川市柴崎町4-6-3',
    latitude: 35.6975,
    longitude: 139.4140,
  },
  hiaceCapacity: 4,
  accommodationThreshold: {
    travelMinutes: 180,
    returnTimeLimit: '20:00',
  },
  roadCorrectionFactor: 1.4,
  averageSpeedKmh: 40,
  highwaySpeedKmh: 70,
  highwayCorrectionFactor: 1.2,
};

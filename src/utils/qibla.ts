/**
 * Calculate Qibla direction in degrees from true North
 * Kaaba coordinates: 21.4225° N, 39.8262° E
 */
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export function calculateQiblaDirection(userLat: number, userLng: number): number {
  const phiK = (KAABA_LAT * Math.PI) / 180.0;
  const lambdaK = (KAABA_LNG * Math.PI) / 180.0;
  const phi = (userLat * Math.PI) / 180.0;
  const lambda = (userLng * Math.PI) / 180.0;

  const numerator = Math.sin(lambdaK - lambda);
  const denominator = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);

  let qiblaRad = Math.atan2(numerator, denominator);
  let qiblaDeg = (qiblaRad * 180.0) / Math.PI;

  return Math.round((qiblaDeg + 360) % 360);
}

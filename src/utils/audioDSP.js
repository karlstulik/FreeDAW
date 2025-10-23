const SATURATION_CURVE_CACHE = new Map();
const DEFAULT_CURVE_SAMPLES = 2048;

const LINEAR_CURVE = (() => {
  const curve = new Float32Array(DEFAULT_CURVE_SAMPLES);
  for (let i = 0; i < DEFAULT_CURVE_SAMPLES; i++) {
    const x = (i * 2) / (DEFAULT_CURVE_SAMPLES - 1) - 1;
    curve[i] = x;
  }
  return curve;
})();

/**
 * Clamp a numeric value between the provided range.
 * Guard for NaN values to keep audio params stable.
 */
export function clamp(value, min = 0, max = 1) {
  if (Number.isNaN(value) || value === undefined || value === null) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Return (and cache) a high quality smooth saturation curve for WaveShaper nodes.
 * Uses tanh transfer, scaled by the requested amount, and caches per rounded amount.
 */
export function getSaturationCurve(amount = 0) {
  const normalized = clamp(amount, 0, 1);
  if (normalized <= 0.0001) {
    return LINEAR_CURVE;
  }

  const key = Math.round(normalized * 1000) / 1000; // cache granularity of 0.001
  if (SATURATION_CURVE_CACHE.has(key)) {
    return SATURATION_CURVE_CACHE.get(key);
  }

  const curve = new Float32Array(DEFAULT_CURVE_SAMPLES);
  // Scale the tanh curve to provide useful drive across the [0, 1] range
  const drive = 1 + normalized * 55;
  for (let i = 0; i < DEFAULT_CURVE_SAMPLES; i++) {
    const x = (i * 2) / (DEFAULT_CURVE_SAMPLES - 1) - 1;
    curve[i] = Math.tanh(drive * x);
  }

  SATURATION_CURVE_CACHE.set(key, curve);
  return curve;
}

import zlib from 'zlib';

const TELEMETRY_KEYS = [
  't',
  'x',
  'z',
  'speed',
  'throttle',
  'brake',
  'gear',
  'drs',
  'ers',
  'lapNum',
  'lapDistance'
];

/**
 * Strategy 3: Compress telemetry data
 * Converts { "driver_id": [ { t, x, z ... }, ... ] }
 * to { "driver_id": [ [ t, x, z ... ], ... ] } and compresses with Brotli.
 * @param {Object} telemetryObj - Original telemetry object
 * @returns {Buffer} - Compressed binary telemetry buffer
 */
export function compressTelemetry(telemetryObj) {
  const minimized = {};
  
  for (const [driverId, points] of Object.entries(telemetryObj)) {
    if (!points || !Array.isArray(points)) continue;
    
    minimized[driverId] = points.map(pt => {
      return TELEMETRY_KEYS.map(key => pt[key]);
    });
  }
  
  const jsonStr = JSON.stringify(minimized);
  // Compress using Brotli with quality level 4 (fast compression, high ratio)
  return zlib.brotliCompressSync(Buffer.from(jsonStr, 'utf8'), {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4
    }
  });
}

/**
 * Strategy 3: Decompress telemetry data
 * Decompresses Brotli binary buffer and maps array representation back to objects.
 * @param {Buffer} compressedBuffer - Compressed binary telemetry
 * @returns {Object} - Restored telemetry object
 */
export function decompressTelemetry(compressedBuffer) {
  if (!compressedBuffer) return {};
  
  const decompressed = zlib.brotliDecompressSync(compressedBuffer);
  const minimized = JSON.parse(decompressed.toString('utf8'));
  const restored = {};
  
  for (const [driverId, points] of Object.entries(minimized)) {
    if (!points || !Array.isArray(points)) continue;
    
    restored[driverId] = points.map(arr => {
      const pt = {};
      TELEMETRY_KEYS.forEach((key, idx) => {
        pt[key] = arr[idx];
      });
      return pt;
    });
  }
  
  return restored;
}

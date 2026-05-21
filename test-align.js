import fs from 'fs-extra';

const CACHE_FILE = './cache/Shanghai_Race_2026-03-18T20-48-51-728Z.json';
const CSV_FILE = '/Users/yash/Desktop/opencode/Telemetrieassistant/tracks/Shanghai.csv';

function resampleLoop(points, numSamples) {
  const dists = [0];
  let totalDist = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const dx = next.x - points[i].x;
    const dz = next.z - points[i].z;
    const d = Math.hypot(dx, dz);
    totalDist += d;
    dists.push(totalDist);
  }

  const resampled = [];
  const step = totalDist / numSamples;

  let currentIdx = 0;
  for (let i = 0; i < numSamples; i++) {
    const targetDist = i * step;
    while (currentIdx < points.length && dists[currentIdx + 1] < targetDist) {
      currentIdx++;
    }
    
    const p0 = points[currentIdx];
    const p1 = points[(currentIdx + 1) % points.length];
    const d0 = dists[currentIdx];
    const d1 = dists[currentIdx + 1];
    
    let ratio = 0;
    if (d1 > d0) {
      ratio = (targetDist - d0) / (d1 - d0);
    }
    
    resampled.push({
      x: p0.x + (p1.x - p0.x) * ratio,
      z: p0.z + (p1.z - p0.z) * ratio
    });
  }
  return resampled;
}

async function run() {
  const session = await fs.readJson(CACHE_FILE);
  const driverTelemetry = Object.values(session.telemetry)[0];
  
  const lap2Telemetry = driverTelemetry.filter(pt => pt.lapNum === 2);
  const telemetryPoints = lap2Telemetry.length > 10 
    ? lap2Telemetry.map(pt => ({ x: pt.x, z: pt.z }))
    : driverTelemetry.map(pt => ({ x: pt.x, z: pt.z }));

  console.log(`Telemetry loop points: ${telemetryPoints.length}`);

  const csvText = await fs.readFile(CSV_FILE, 'utf8');
  const csvPoints = csvText.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split(',');
      return { x: parseFloat(parts[0]), z: parseFloat(parts[1]) };
    });
  console.log(`CSV loop points: ${csvPoints.length}`);

  const N = 200;
  const A = resampleLoop(telemetryPoints, N); // Game
  const B_raw = resampleLoop(csvPoints, N);   // CSV

  let bestMSE = Infinity;
  let bestK = 0;
  let bestD = 1;
  let bestReflectX = false;
  let bestReflectZ = false;
  let bestTheta = 0;
  let bestScale = 1;
  let bestCentroidA = null;
  let bestCentroidB = null;

  // Search over reflections
  const reflectOptions = [
    { rx: false, rz: false },
    { rx: true, rz: false },
    { rx: false, rz: true },
    { rx: true, rz: true }
  ];

  for (const refl of reflectOptions) {
    // Transform B based on reflection
    const B = B_raw.map(p => ({
      x: refl.rx ? -p.x : p.x,
      z: refl.rz ? -p.z : p.z
    }));

    // Compute centroids
    const centroidA = { x: 0, z: 0 };
    const centroidB = { x: 0, z: 0 };
    A.forEach(p => { centroidA.x += p.x; centroidA.z += p.z; });
    B.forEach(p => { centroidB.x += p.x; centroidB.z += p.z; });
    centroidA.x /= N; centroidA.z /= N;
    centroidB.x /= N; centroidB.z /= N;

    // Center loops
    const Ac = A.map(p => ({ x: p.x - centroidA.x, z: p.z - centroidA.z }));
    const Bc = B.map(p => ({ x: p.x - centroidB.x, z: p.z - centroidB.z }));

    // Scale
    let scaleA = 0;
    let scaleB = 0;
    Ac.forEach(p => scaleA += Math.hypot(p.x, p.z));
    Bc.forEach(p => scaleB += Math.hypot(p.x, p.z));
    scaleA /= N;
    scaleB /= N;
    const S = scaleA / scaleB;

    const directions = [1, -1];
    for (const d of directions) {
      for (let k = 0; k < N; k++) {
        let Sxx = 0, Sxz = 0, Szx = 0, Szz = 0;
        for (let i = 0; i < N; i++) {
          const j = d === 1 ? (i + k) % N : (N - 1 - i + k) % N;
          const ax = Ac[i].x;
          const az = Ac[i].z;
          const bx = Bc[j].x * S;
          const bz = Bc[j].z * S;
          
          Sxx += ax * bx;
          Sxz += ax * bz;
          Szx += az * bx;
          Szz += az * bz;
        }
        
        const theta = Math.atan2(Sxz - Szx, Sxx + Szz);
        
        // Compute MSE
        let mse = 0;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        for (let i = 0; i < N; i++) {
          const j = d === 1 ? (i + k) % N : (N - 1 - i + k) % N;
          const ax = Ac[i].x;
          const az = Ac[i].z;
          
          const bx = Bc[j].x * S;
          const bz = Bc[j].z * S;
          const rx = bx * cos - bz * sin;
          const rz = bx * sin + bz * cos;
          
          mse += Math.hypot(ax - rx, az - rz) ** 2;
        }
        mse /= N;

        if (mse < bestMSE) {
          bestMSE = mse;
          bestK = k;
          bestD = d;
          bestReflectX = refl.rx;
          bestReflectZ = refl.rz;
          bestTheta = theta;
          bestScale = S;
          bestCentroidA = centroidA;
          bestCentroidB = centroidB;
        }
      }
    }
  }

  console.log(`Best alignment found:`);
  console.log(`  Reflect X:   ${bestReflectX}`);
  console.log(`  Reflect Z:   ${bestReflectZ}`);
  console.log(`  Shift k:     ${bestK}`);
  console.log(`  Direction d: ${bestD}`);
  console.log(`  Rotation θ:  ${(bestTheta * 180 / Math.PI).toFixed(2)}°`);
  console.log(`  Scale S:     ${bestScale.toFixed(4)}`);
  console.log(`  Min MSE:     ${bestMSE.toFixed(4)} meters^2`);
  console.log(`  Average pos error: ${Math.sqrt(bestMSE).toFixed(2)} meters`);
}

run();

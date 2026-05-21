import fs from 'fs-extra';
import path from 'path';

const CACHE_FILE = './cache/Melbourne_Race_2026-03-11T20-14-35-318Z.json';
const CSV_FILE = '/Users/yash/Desktop/opencode/Telemetrieassistant/tracks/Melbourne.csv';

async function run() {
  const session = await fs.readJson(CACHE_FILE);
  const driverTelemetry = Object.values(session.telemetry)[0];
  console.log('Telemetry samples count:', driverTelemetry.length);
  
  // Find min/max for telemetry
  let telMinX = Infinity, telMaxX = -Infinity;
  let telMinZ = Infinity, telMaxZ = -Infinity;
  driverTelemetry.forEach(pt => {
    if (pt.x < telMinX) telMinX = pt.x;
    if (pt.x > telMaxX) telMaxX = pt.x;
    if (pt.z < telMinZ) telMinZ = pt.z;
    if (pt.z > telMaxZ) telMaxZ = pt.z;
  });
  console.log('Telemetry Bounds:');
  console.log(`  X: [${telMinX.toFixed(2)}, ${telMaxX.toFixed(2)}] (delta: ${(telMaxX - telMinX).toFixed(2)})`);
  console.log(`  Z: [${telMinZ.toFixed(2)}, ${telMaxZ.toFixed(2)}] (delta: ${(telMaxZ - telMinZ).toFixed(2)})`);

  // Read CSV
  const csvText = await fs.readFile(CSV_FILE, 'utf8');
  const csvLines = csvText.split('\n');
  const csvPoints = [];
  for (const line of csvLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 2) {
      csvPoints.push({ x: parseFloat(parts[0]), z: parseFloat(parts[1]) });
    }
  }
  console.log('CSV samples count:', csvPoints.length);
  
  let csvMinX = Infinity, csvMaxX = -Infinity;
  let csvMinZ = Infinity, csvMaxZ = -Infinity;
  csvPoints.forEach(pt => {
    if (pt.x < csvMinX) csvMinX = pt.x;
    if (pt.x > csvMaxX) csvMaxX = pt.x;
    if (pt.z < csvMinZ) csvMinZ = pt.z;
    if (pt.z > csvMaxZ) csvMaxZ = pt.z;
  });
  console.log('CSV Bounds:');
  console.log(`  X: [${csvMinX.toFixed(2)}, ${csvMaxX.toFixed(2)}] (delta: ${(csvMaxX - csvMinX).toFixed(2)})`);
  console.log(`  Z: [${csvMinZ.toFixed(2)}, ${csvMaxZ.toFixed(2)}] (delta: ${(csvMaxZ - csvMinZ).toFixed(2)})`);

  // Print first few coordinates of both
  console.log('First 5 Telemetry points:', driverTelemetry.slice(0, 5).map(p => ({ x: p.x, z: p.z })));
  console.log('First 5 CSV points:', csvPoints.slice(0, 5));
}

run();

import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3002;
const RESERVE_DIR = '/Users/yash/Desktop/opencode/UDP Player/REserve';
const CACHE_DIR = path.join(__dirname, 'cache');

// Ensure cache directory exists
fs.ensureDirSync(CACHE_DIR);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TRACKS = {
  0: "Melbourne", 1: "Paul Ricard", 2: "Shanghai", 3: "Sakhir (Bahrain)",
  4: "Catalunya", 5: "Monaco", 6: "Montreal", 7: "Silverstone",
  8: "Hockenheim", 9: "Hungaroring", 10: "Spa", 11: "Monza",
  12: "Singapore", 13: "Suzuka", 14: "Abu Dhabi", 15: "Texas",
  16: "Brazil", 17: "Austria", 18: "Sochi", 19: "Mexico",
  20: "Baku", 21: "Sakhir", 22: "Yas Marina", 23: "Zandvoort", // legacy
  24: "Imola", 25: "Portimao",
  26: "Zandvoort", 27: "Imola", // F1 2025 mappings
  28: "Las Vegas", // legacy
  29: "Jeddah", 30: "Miami", 31: "Las Vegas", 32: "Losail", // F1 2025 mappings
  33: "Barcelona", 34: "Sepang", 35: "Baku (F1 22)",
  36: "Red Bull Ring", 37: "Zandvoort (F1 22)", 38: "Spa (F1 22)", 39: "Silverstone (Reverse)",
  40: "Austria (Reverse)", 41: "Zandvoort (Reverse)"
};

const SESSION_TYPES = {
  0: "Unknown", 1: "Practice 1", 2: "Practice 2", 3: "Practice 3",
  4: "Short Practice", 5: "Qualifying 1", 6: "Qualifying 2", 7: "Qualifying 3",
  8: "Short Qualifying", 9: "One-Shot Qualifying", 10: "Sprint Shootout 1",
  11: "Sprint Shootout 2", 12: "Sprint Shootout 3", 13: "Short Sprint Shootout",
  14: "One-Shot Sprint Shootout", 15: "Race", 16: "Race 2", 17: "Race 3",
  18: "Time Trial"
};

// Helper to inspect session metadata from file or cache
function getSessionMetadataSync(filename) {
  const nameWithoutExt = path.basename(filename, '.bin');
  const cachePath = path.join(CACHE_DIR, `${nameWithoutExt}.json`);
  const filePath = path.join(RESERVE_DIR, filename);

  // Parse date from filename
  let dateString = "Unknown Date";
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  if (dateMatch) {
    dateString = dateMatch[1].replace(/-/g, ':').replace(/T/, ' ').replace(/:\d+Z$/, ' UTC');
  }

  // 1. If cache exists, read metadata from it
  if (fs.existsSync(cachePath)) {
    try {
      const data = fs.readJsonSync(cachePath);
      let status = 'FALLBACK';
      let avgError = null;

      const trackCSVName = mapTrackNameToCSV(data.trackName || '');
      const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
      if (fs.existsSync(csvPath)) {
        if (data.alignmentParams && data.alignmentParams.avgError !== undefined) {
          avgError = data.alignmentParams.avgError;
        } else if (data.alignmentParams && data.alignmentParams.mse !== undefined) {
          avgError = Math.sqrt(data.alignmentParams.mse);
        }
        
        if (avgError !== null) {
          status = avgError > 15 ? 'MISMATCH' : 'VERIFIED';
        } else {
          status = data.alignmentParams ? 'VERIFIED' : 'FALLBACK';
        }
      }

      return {
        filename,
        trackName: data.trackName,
        sessionType: data.sessionTypeName,
        dateString,
        sizeMB: (fs.statSync(filePath).size / (1024 * 1024)).toFixed(1),
        isProcessed: true,
        isRace: data.sessionType === 15 || data.sessionType === 16 || data.sessionType === 17,
        status,
        avgError
      };
    } catch (e) {
      console.error(`Error reading cache for ${filename}:`, e);
    }
  }

  // 2. If no cache, read header to detect session details
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(100 * 1024); // read first 100KB to ensure we hit session packet
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    
    let offset = 0;
    let sessionType = -1;
    let trackId = -1;
    
    while (offset + 6 < bytesRead) {
      const timeOffset = buffer.readUInt32LE(offset);
      const packetLen = buffer.readUInt16LE(offset + 4);
      const msgStart = offset + 6;
      
      if (msgStart + packetLen > bytesRead) break;
      
      const msg = buffer.subarray(msgStart, msgStart + packetLen);
      offset += 6 + packetLen;
      
      if (msg.length < 29) continue;
      
      const pid = msg[6];
      if (pid === 1) {
        sessionType = msg[35];
        trackId = msg[36];
        break;
      }
    }
    
    const trackName = TRACKS[trackId] || `Track ${trackId}`;
    const sessionTypeName = SESSION_TYPES[sessionType] || `Session ${sessionType}`;
    const isRace = sessionType === 15 || sessionType === 16 || sessionType === 17;
    const stat = fs.statSync(filePath);
    
    const trackCSVName = mapTrackNameToCSV(trackName);
    const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
    const status = fs.existsSync(csvPath) ? 'VERIFIED' : 'FALLBACK';

    return {
      filename,
      trackName,
      sessionType: sessionTypeName,
      dateString,
      sizeMB: (stat.size / (1024 * 1024)).toFixed(1),
      isProcessed: false,
      isRace,
      status,
      avgError: null
    };
  } catch (e) {
    console.error(`Error reading header for ${filename}:`, e);
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Retrieve all available session files (filtered to only include Races)
app.get('/api/sessions', async (req, res) => {
  try {
    if (!fs.existsSync(RESERVE_DIR)) {
      return res.status(404).json({ error: `Reserve directory not found at ${RESERVE_DIR}` });
    }

    const files = await fs.readdir(RESERVE_DIR);
    const binFiles = files.filter(f => f.endsWith('.bin'));

    const raceSessions = [];
    for (const filename of binFiles) {
      const meta = getSessionMetadataSync(filename);
      if (meta && meta.isRace) {
        raceSessions.push(meta);
      }
    }

    // Sort: newest first
    raceSessions.sort((a, b) => b.filename.localeCompare(a.filename));

    res.json(raceSessions);
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get parsed session details (downsampled telemetry + track)
// Helper to get or parse session (downsampled telemetry + track)
async function getOrParseSession(filename) {
  const nameWithoutExt = path.basename(filename, '.bin');
  const cachePath = path.join(CACHE_DIR, `${nameWithoutExt}.json`);

  // 1. Return cached if exists
  if (await fs.pathExists(cachePath)) {
    console.log(`Serving cached telemetry for ${filename}`);
    return await fs.readJson(cachePath);
  }

  // 2. Parse file if not cached
  const filePath = path.join(RESERVE_DIR, filename);
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filename}`);
  }

  console.log(`Parsing and downsampling ${filename}...`);
  const buffer = await fs.readFile(filePath);
  const fileSize = buffer.length;

  // We will build the following structure
  let trackId = -1;
  let sessionType = 0;
  const drivers = {}; // index -> { index, name, isHuman, teamId }
  const telemetry = {}; // index -> [ { t, x, z, speed, throttle, brake, gear, drs, ers } ]
  const lastSampleTime = {}; // index -> last sampled sessionTime

  // Keep track of the current state of all cars
  const currentState = Array.from({ length: 22 }, () => ({
    x: 0,
    z: 0,
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 0,
    drs: 0,
    ers: 100,
    lapNum: 1,
    lapDistance: 0
  }));

  let offset = 0;
  let packetCount = 0;

  while (offset + 6 < fileSize) {
    const timeOffset = buffer.readUInt32LE(offset);
    const packetLen = buffer.readUInt16LE(offset + 4);
    const msgStart = offset + 6;
    
    if (msgStart + packetLen > fileSize) {
      break;
    }

    const msg = buffer.subarray(msgStart, msgStart + packetLen);
    offset += 6 + packetLen;
    packetCount++;

    if (msg.length < 29) continue; // Header length is 29 bytes

    const pid = msg[6];
    const t = msg.readFloatLE(15);

    // --- 1. Participants Packet (pid = 4) ---
    if (pid === 4) {
      const numActiveCars = msg[29];
      const firstEntry = 30;
      for (let i = 0; i < 22; i++) {
        const pOffset = firstEntry + (i * 57);
        if (pOffset + 57 > msg.length) break;

        const aiControlled = msg[pOffset];
        const teamId = msg[pOffset + 3];
        // Read driver name (length 32)
        const nameBuf = msg.subarray(pOffset + 7, pOffset + 7 + 32);
        const nullIndex = nameBuf.indexOf(0);
        const name = (nullIndex >= 0 ? nameBuf.subarray(0, nullIndex) : nameBuf)
          .toString('utf8')
          .trim();

        if (name.length > 0) {
          drivers[i] = {
            index: i,
            name: name,
            isHuman: aiControlled === 0,
            teamId: teamId
          };
        }
      }
    } 
    // --- 2. Session Packet (pid = 1) ---
    else if (pid === 1) {
      sessionType = msg[35];
      trackId = msg[36];
    }
    // --- 3. Motion Packet (pid = 0) ---
    else if (pid === 0) {
      const firstEntry = 29;
      for (let i = 0; i < 22; i++) {
        const mOffset = firstEntry + (i * 60);
        if (mOffset + 60 > msg.length) break;

        currentState[i].x = msg.readFloatLE(mOffset);     // worldPositionX
        currentState[i].z = msg.readFloatLE(mOffset + 8); // worldPositionZ
      }
    }
    // --- 4. Car Telemetry Packet (pid = 6) ---
    else if (pid === 6) {
      const firstEntry = 29;
      for (let i = 0; i < 22; i++) {
        const tOffset = firstEntry + (i * 60);
        if (tOffset + 60 > msg.length) break;

        currentState[i].speed = msg.readUInt16LE(tOffset);
        currentState[i].throttle = msg.readFloatLE(tOffset + 2);
        currentState[i].brake = msg.readFloatLE(tOffset + 10);
        currentState[i].gear = msg.readInt8(tOffset + 15);
        currentState[i].drs = msg[tOffset + 18] & 1;
      }
    }
    // --- 5. Car Status Packet (pid = 7) ---
    else if (pid === 7) {
      const firstEntry = 29;
      for (let i = 0; i < 22; i++) {
        const sOffset = firstEntry + (i * 55);
        if (sOffset + 55 > msg.length) break;

        const ersJoules = msg.readFloatLE(sOffset + 37); // ersStoreEnergy
        currentState[i].ers = (ersJoules / 4000000.0) * 100; // Capacity is 4MJ
      }
    }
    // --- 6. Lap Data Packet (pid = 2) ---
    else if (pid === 2) {
      const headerLength = 29;
      for (let i = 0; i < 22; i++) {
        const lOffset = headerLength + (i * 57);
        if (lOffset + 57 > msg.length) break;

        currentState[i].lapDistance = msg.readFloatLE(lOffset + 20);
        currentState[i].lapNum = msg[lOffset + 33];
      }
    }

    // --- Downsample Telemetry Logging ---
    // We log for every driver index that is known to exist
    for (const idxStr of Object.keys(drivers)) {
      const idx = parseInt(idxStr);
      const isHuman = drivers[idx].isHuman;

      // Human = 30Hz (~0.033s), AI = 5Hz (~0.200s)
      const sampleInterval = isHuman ? 0.033 : 0.200;
      const lastT = lastSampleTime[idx] || 0;

      // Handle flashback: if session time jumps backwards
      if (t < lastT - 1.0) {
        // Truncate telemetry to before t
        telemetry[idx] = (telemetry[idx] || []).filter(s => s.t < t);
        lastSampleTime[idx] = t;
      } 
      // Normal forward time: log sample if interval exceeded
      else if (!lastSampleTime[idx] || t - lastT >= sampleInterval) {
        if (!telemetry[idx]) telemetry[idx] = [];

        telemetry[idx].push({
          t: Math.round(t * 1000) / 1000, // round to 3 decimals
          x: Math.round(currentState[idx].x * 100) / 100,
          z: Math.round(currentState[idx].z * 100) / 100,
          speed: currentState[idx].speed,
          throttle: Math.round(currentState[idx].throttle * 100) / 100,
          brake: Math.round(currentState[idx].brake * 100) / 100,
          gear: currentState[idx].gear,
          drs: currentState[idx].drs,
          ers: Math.round(currentState[idx].ers * 10) / 10,
          lapNum: currentState[idx].lapNum,
          lapDistance: Math.round(currentState[idx].lapDistance * 10) / 10
        });

        lastSampleTime[idx] = t;
      }
    }
  }

  // Clean up empty driver records if they never got any telemetry
  for (const idxStr of Object.keys(drivers)) {
    const idx = parseInt(idxStr);
    if (!telemetry[idx] || telemetry[idx].length === 0) {
      delete drivers[idx];
      delete telemetry[idx];
    }
  }

  // If no drivers were found, fallback
  if (Object.keys(drivers).length === 0) {
    drivers[15] = { index: 15, name: "Markus Lanz", isHuman: true, teamId: 0 };
    telemetry[15] = [];
  }

  const trackName = TRACKS[trackId] || `Track ${trackId}`;

  // Find reference driver & compute alignment parameters if track CSV exists
  let alignmentParams = null;
  try {
    const trackCSVName = mapTrackNameToCSV(trackName);
    const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
    if (await fs.pathExists(csvPath)) {
      const csvText = await fs.readFile(csvPath, 'utf8');
      const csvPoints = [];
      csvText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const parts = trimmed.split(',');
        if (parts.length >= 4) {
          csvPoints.push({
            x: parseFloat(parts[0]),
            z: parseFloat(parts[1]),
            wRight: parseFloat(parts[2]),
            wLeft: parseFloat(parts[3])
          });
        }
      });

      if (csvPoints.length > 0) {
        let referenceDriverIdx = null;
        let maxPoints = 0;
        for (const [idx, pts] of Object.entries(telemetry)) {
          if (pts.length > maxPoints) {
            maxPoints = pts.length;
            referenceDriverIdx = idx;
          }
        }

        if (referenceDriverIdx !== null) {
          const driverTelemetry = telemetry[referenceDriverIdx];
          const laps = {};
          driverTelemetry.forEach(pt => {
            if (!laps[pt.lapNum]) laps[pt.lapNum] = [];
            laps[pt.lapNum].push({ x: pt.x, z: pt.z });
          });

          let telemetryPoints = [];
          if (laps[2] && laps[2].length > 50) {
            telemetryPoints = laps[2];
          } else {
            let maxLapPoints = 0;
            for (const [lapNum, pts] of Object.entries(laps)) {
              if (pts.length > maxLapPoints && pts.length > 50) {
                maxLapPoints = pts.length;
                telemetryPoints = pts;
              }
            }
          }

          if (telemetryPoints.length === 0) {
            telemetryPoints = driverTelemetry.map(pt => ({ x: pt.x, z: pt.z }));
          }

          alignmentParams = getAlignmentParameters(telemetryPoints, csvPoints);
        }
      }
    }
  } catch (alignErr) {
    console.error("Failed to compute alignment parameters during ingestion:", alignErr);
  }

  let status = 'FALLBACK';
  let avgError = null;
  const trackCSVName = mapTrackNameToCSV(trackName);
  const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
  if (fs.existsSync(csvPath)) {
    if (alignmentParams) {
      avgError = alignmentParams.avgError || (alignmentParams.mse !== undefined ? Math.sqrt(alignmentParams.mse) : null);
      status = (avgError !== null && avgError > 15) ? 'MISMATCH' : 'VERIFIED';
    }
  }

  const responseData = {
    filename,
    trackId,
    trackName,
    sessionType,
    sessionTypeName: SESSION_TYPES[sessionType] || `Session ${sessionType}`,
    drivers: Object.values(drivers),
    telemetry,
    alignmentParams,
    status,
    avgError
  };

  // Save to cache
  await fs.writeJson(cachePath, responseData);
  console.log(`Cached telemetry saved for ${filename}`);

  return responseData;
}

app.get('/api/sessions/:filename', async (req, res) => {
  const filename = req.params.filename;
  try {
    const data = await getOrParseSession(filename);
    res.json(data);
  } catch (error) {
    console.error("Error parsing telemetry:", error);
    res.status(500).json({ error: error.message });
  }
});

const TRACKS_DIR = '/Users/yash/Desktop/opencode/Telemetrieassistant/tracks';
const RACELINES_DIR = '/Users/yash/Desktop/opencode/Telemetrieassistant/racelines';

const mapTrackNameToCSV = (trackName) => {
  const name = trackName.toLowerCase().replace(/\s+/g, '').replace(/\([^)]*\)/g, '');
  if (name.includes('redbullring') || name.includes('austria')) return 'Spielberg';
  if (name.includes('sakhir') || name.includes('bahrain')) return 'Sakhir';
  if (name.includes('mexico')) return 'MexicoCity';
  if (name.includes('yasmarina')) return 'YasMarina';
  if (name.includes('brandshatch')) return 'BrandsHatch';
  if (name.includes('nürburgring') || name.includes('nuerburgring')) return 'Nuerburgring';
  if (name.includes('saopaulo') || name.includes('brazil')) return 'SaoPaulo';
  if (name.includes('budapest') || name.includes('hungaroring')) return 'Budapest';
  if (name.includes('catalunya') || name.includes('barcelona')) return 'Catalunya';
  
  if (name === 'melbourne') return 'Melbourne';
  if (name === 'shanghai') return 'Shanghai';
  if (name === 'montreal') return 'Montreal';
  if (name === 'monza') return 'Monza';
  if (name === 'sepang') return 'Sepang';
  if (name === 'silverstone') return 'Silverstone';
  if (name === 'sochi') return 'Sochi';
  if (name === 'spa') return 'Spa';
  if (name === 'suzuka') return 'Suzuka';
  if (name === 'zandvoort') return 'Zandvoort';
  if (name === 'austin' || name === 'texas') return 'Austin';
  if (name === 'hockenheim') return 'Hockenheim';
  
  return trackName.replace(/\s+/g, '');
};

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

function getAlignmentParameters(telemetryPoints, csvPoints) {
  const N = 200;
  const A = resampleLoop(telemetryPoints, N);
  const B_raw = resampleLoop(csvPoints, N);

  let bestMSE = Infinity;
  let bestParams = null;

  const reflectOptions = [
    { rx: false, rz: false },
    { rx: true, rz: false },
    { rx: false, rz: true },
    { rx: true, rz: true }
  ];

  const centroidA = { x: 0, z: 0 };
  A.forEach(p => { centroidA.x += p.x; centroidA.z += p.z; });
  centroidA.x /= N; centroidA.z /= N;
  const Ac = A.map(p => ({ x: p.x - centroidA.x, z: p.z - centroidA.z }));

  let scaleA = 0;
  Ac.forEach(p => scaleA += Math.hypot(p.x, p.z));
  scaleA /= N;

  for (const refl of reflectOptions) {
    const B = B_raw.map(p => ({
      x: refl.rx ? -p.x : p.x,
      z: refl.rz ? -p.z : p.z
    }));

    const centroidB = { x: 0, z: 0 };
    B.forEach(p => { centroidB.x += p.x; centroidB.z += p.z; });
    centroidB.x /= N; centroidB.z /= N;
    const Bc = B.map(p => ({ x: p.x - centroidB.x, z: p.z - centroidB.z }));

    let scaleB = 0;
    Bc.forEach(p => scaleB += Math.hypot(p.x, p.z));
    scaleB /= N;
    
    const S = scaleA / (scaleB || 1);

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
          bestParams = {
            reflectX: refl.rx,
            reflectZ: refl.rz,
            k,
            direction: d,
            theta,
            scale: S,
            centroidA,
            centroidB,
            mse: bestMSE,
            avgError: Math.sqrt(bestMSE)
          };
        }
      }
    }
  }

  return bestParams;
}

function transformPoint(p, params) {
  let rx = params.reflectX ? -p.x : p.x;
  let rz = params.reflectZ ? -p.z : p.z;
  let xc = rx - params.centroidB.x;
  let zc = rz - params.centroidB.z;
  let xs = xc * params.scale;
  let zs = zc * params.scale;
  const cos = Math.cos(params.theta);
  const sin = Math.sin(params.theta);
  let xr = xs * cos - zs * sin;
  let zr = xs * sin + zs * cos;
  return {
    x: xr + params.centroidA.x,
    z: zr + params.centroidA.z
  };
}

async function getSessionAlignmentParams(sessionFilename, trackName) {
  const sessionData = await getOrParseSession(sessionFilename);

  const trackCSVName = mapTrackNameToCSV(trackName);
  const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
  
  if (!await fs.pathExists(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  const csvText = await fs.readFile(csvPath, 'utf8');
  const csvPoints = [];
  csvText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      csvPoints.push({
        x: parseFloat(parts[0]),
        z: parseFloat(parts[1]),
        wRight: parseFloat(parts[2]),
        wLeft: parseFloat(parts[3])
      });
    }
  });

  if (csvPoints.length === 0) {
    throw new Error('Empty CSV file');
  }

  // If alignmentParams was precomputed during session ingestion/caching, use it
  if (sessionData.alignmentParams) {
    return { alignmentParams: sessionData.alignmentParams, csvPoints };
  }

  // Otherwise, calculate on the fly (fallback)
  let referenceDriverIdx = null;
  let maxPoints = 0;
  for (const [idx, points] of Object.entries(sessionData.telemetry)) {
    if (points.length > maxPoints) {
      maxPoints = points.length;
      referenceDriverIdx = idx;
    }
  }
  
  if (!referenceDriverIdx) {
    throw new Error('No telemetry found');
  }
  
  const driverTelemetry = sessionData.telemetry[referenceDriverIdx];
  const laps = {};
  driverTelemetry.forEach(pt => {
    if (!laps[pt.lapNum]) laps[pt.lapNum] = [];
    laps[pt.lapNum].push({ x: pt.x, z: pt.z });
  });
  
  let telemetryPoints = [];
  if (laps[2] && laps[2].length > 50) {
    telemetryPoints = laps[2];
  } else {
    let maxLapPoints = 0;
    for (const [lapNum, pts] of Object.entries(laps)) {
      if (pts.length > maxLapPoints && pts.length > 50) {
        maxLapPoints = pts.length;
        telemetryPoints = pts;
      }
    }
  }
  
  if (telemetryPoints.length === 0) {
    telemetryPoints = driverTelemetry.map(pt => ({ x: pt.x, z: pt.z }));
  }

  const alignmentParams = getAlignmentParameters(telemetryPoints, csvPoints);
  return { alignmentParams, csvPoints };
}

app.get('/api/tracks/:trackName', async (req, res) => {
  try {
    const { session } = req.query;
    if (!session) {
      return res.status(400).json({ error: 'Session query parameter is required' });
    }
    const trackName = req.params.trackName;
    const { alignmentParams, csvPoints } = await getSessionAlignmentParams(session, trackName);

    const centerline = [];
    const leftBorder = [];
    const rightBorder = [];
    
    for (let i = 0; i < csvPoints.length; i++) {
      const pt = csvPoints[i];
      const nextPt = csvPoints[(i + 1) % csvPoints.length];
      
      const dx = nextPt.x - pt.x;
      const dz = nextPt.z - pt.z;
      const len = Math.hypot(dx, dz) || 1;
      
      const nx = -dz / len;
      const nz = dx / len;
      
      const lPt = {
        x: pt.x - pt.wLeft * nx,
        z: pt.z - pt.wLeft * nz
      };
      
      const rPt = {
        x: pt.x + pt.wRight * nx,
        z: pt.z + pt.wRight * nz
      };
      
      centerline.push(transformPoint(pt, alignmentParams));
      leftBorder.push(transformPoint(lPt, alignmentParams));
      rightBorder.push(transformPoint(rPt, alignmentParams));
    }

    res.json({ centerline, leftBorder, rightBorder });
  } catch (error) {
    console.error("Error loading track layout:", error);
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/racelines/:trackName', async (req, res) => {
  try {
    const { session } = req.query;
    if (!session) {
      return res.status(400).json({ error: 'Session query parameter is required' });
    }
    const trackName = req.params.trackName;
    const { alignmentParams } = await getSessionAlignmentParams(session, trackName);

    const trackCSVName = mapTrackNameToCSV(trackName);
    const csvPath = path.join(RACELINES_DIR, `${trackCSVName}.csv`);
    
    if (!await fs.pathExists(csvPath)) {
      return res.status(404).json({ error: `Raceline CSV not found: ${csvPath}` });
    }
    
    const csvText = await fs.readFile(csvPath, 'utf8');
    const racelinePoints = [];
    csvText.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        racelinePoints.push({
          x: parseFloat(parts[0]),
          z: parseFloat(parts[1])
        });
      }
    });

    if (racelinePoints.length === 0) {
      return res.status(400).json({ error: 'Empty raceline CSV' });
    }

    const points = racelinePoints.map(pt => transformPoint(pt, alignmentParams));
    res.json({ points });
  } catch (error) {
    console.error("Error loading raceline:", error);
    res.status(404).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

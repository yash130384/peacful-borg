import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RESERVE_DIR,
  CACHE_DIR,
  TRACKS_DIR,
  getOrParseSession,
  mapTrackNameToCSV
} from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Starting ingestion and validation script...");
  console.log(`Reserve Dir: ${RESERVE_DIR}`);
  console.log(`Cache Dir: ${CACHE_DIR}`);
  console.log(`Tracks Dir: ${TRACKS_DIR}`);

  // 1. Invalidate cache by deleting existing cache files (excluding ingest_report.json itself if needed, but let's delete all *.json)
  console.log("Invalidating existing cache...");
  if (await fs.pathExists(CACHE_DIR)) {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.remove(path.join(CACHE_DIR, file));
      }
    }
  } else {
    await fs.ensureDir(CACHE_DIR);
  }

  // 2. Find all .bin files in RESERVE_DIR
  if (!await fs.pathExists(RESERVE_DIR)) {
    console.error(`Reserve directory does not exist: ${RESERVE_DIR}`);
    process.exit(1);
  }

  const allFiles = await fs.readdir(RESERVE_DIR);
  const binFiles = allFiles.filter(f => f.endsWith('.bin'));
  console.log(`Found ${binFiles.length} session binary files to process.`);

  const report = {};

  // 3. Process each session
  for (const filename of binFiles) {
    console.log(`\nProcessing ${filename}...`);
    try {
      // getOrParseSession parses and caches the telemetry data
      const sessionData = await getOrParseSession(filename);

      // Check if CSV exists
      const trackCSVName = mapTrackNameToCSV(sessionData.trackName);
      const csvPath = path.join(TRACKS_DIR, `${trackCSVName}.csv`);
      const csvExists = await fs.pathExists(csvPath);

      let status = 'MISMATCH';
      let avgError = null;

      if (!csvExists) {
        status = 'FALLBACK';
      } else {
        const alignmentParams = sessionData.alignmentParams;
        if (alignmentParams && alignmentParams.mse !== undefined && alignmentParams.mse !== null) {
          avgError = Math.sqrt(alignmentParams.mse);
          if (avgError < 15.0) {
            status = 'VERIFIED';
          } else {
            status = 'MISMATCH';
          }
        } else {
          status = 'MISMATCH';
        }
      }

      console.log(`Result for ${filename}:`);
      console.log(`  Track Name:   ${sessionData.trackName}`);
      console.log(`  Session Type: ${sessionData.sessionTypeName}`);
      console.log(`  CSV Exists:   ${csvExists} (${trackCSVName}.csv)`);
      console.log(`  Avg Error:    ${avgError !== null ? avgError.toFixed(2) + ' meters' : 'N/A'}`);
      console.log(`  Status:       ${status}`);

      report[filename] = {
        status,
        avgError: avgError !== null ? parseFloat(avgError.toFixed(4)) : null,
        trackName: sessionData.trackName,
        sessionType: sessionData.sessionTypeName
      };

    } catch (err) {
      console.error(`Failed to ingest/validate ${filename}:`, err);
      report[filename] = {
        status: 'MISMATCH',
        avgError: null,
        trackName: 'Unknown',
        sessionType: 'Unknown',
        error: err.message
      };
    }
  }

  // 4. Save compiled report to cache/ingest_report.json
  const reportPath = path.join(CACHE_DIR, 'ingest_report.json');
  await fs.writeJson(reportPath, report, { spaces: 2 });
  console.log(`\nIngestion report saved to ${reportPath}`);

  // Summary statistics
  const stats = { VERIFIED: 0, FALLBACK: 0, MISMATCH: 0 };
  Object.values(report).forEach(r => {
    stats[r.status] = (stats[r.status] || 0) + 1;
  });
  console.log(`\nIngestion Summary:`);
  console.log(`  VERIFIED: ${stats.VERIFIED}`);
  console.log(`  FALLBACK: ${stats.FALLBACK}`);
  console.log(`  MISMATCH: ${stats.MISMATCH}`);
}

run().catch(err => {
  console.error("Fatal error running ingestion:", err);
  process.exit(1);
});

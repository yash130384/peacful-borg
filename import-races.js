import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDb } from './db.js';
import { compressTelemetry } from './telemetry-compressor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const RESERVE_DIR = '/Users/yash/Desktop/opencode/UDP Player/REserve';

async function run() {
  console.log("Initializing database...");
  await initDb();

  if (!await fs.pathExists(CACHE_DIR)) {
    console.error(`Cache directory does not exist: ${CACHE_DIR}`);
    process.exit(1);
  }

  const files = await fs.readdir(CACHE_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'ingest_report.json');

  console.log(`Found ${jsonFiles.length} cache files to import.`);

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    const cachePath = path.join(CACHE_DIR, file);
    console.log(`[${i + 1}/${jsonFiles.length}] Importing ${file}...`);

    try {
      const data = await fs.readJson(cachePath);
      
      const filename = data.filename || file.replace('.json', '.bin');
      const trackId = data.trackId !== undefined ? data.trackId : -1;
      const trackName = data.trackName || 'Unknown Track';
      const sessionType = data.sessionType !== undefined ? data.sessionType : 0;
      const sessionTypeName = data.sessionTypeName || 'Unknown';
      const drivers = data.drivers || [];
      const alignmentParams = data.alignmentParams || null;
      const status = data.status || 'FALLBACK';
      const avgError = data.avgError !== undefined ? data.avgError : null;

      // Extract date string from filename
      let dateString = "Unknown Date";
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
      if (dateMatch) {
        dateString = dateMatch[1].replace(/-/g, ':').replace(/T/, ' ').replace(/:\d+Z$/, ' UTC');
      }

      // Determine size MB
      let sizeMB = 0;
      const binPath = path.join(RESERVE_DIR, filename);
      if (await fs.pathExists(binPath)) {
        sizeMB = parseFloat((fs.statSync(binPath).size / (1024 * 1024)).toFixed(1));
      } else {
        // Fallback: estimate from JSON size
        const jsonSize = fs.statSync(cachePath).size;
        sizeMB = parseFloat((jsonSize / (1024 * 1024)).toFixed(1));
      }

      // Compress telemetry
      const telemetryObj = data.telemetry || {};
      const compressedBuffer = compressTelemetry(telemetryObj);
      console.log(`  Compressed telemetry size: ${(compressedBuffer.length / 1024).toFixed(1)} KB (Raw JSON was ${(fs.statSync(cachePath).size / (1024 * 1024)).toFixed(2)} MB)`);

      // Insert into Postgres
      await pool.query(`
        INSERT INTO sessions (
          filename, track_id, track_name, session_type, session_type_name, 
          drivers, alignment_params, status, avg_error, date_string, size_mb, telemetry_compressed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (filename) DO UPDATE SET
          track_id = EXCLUDED.track_id,
          track_name = EXCLUDED.track_name,
          session_type = EXCLUDED.session_type,
          session_type_name = EXCLUDED.session_type_name,
          drivers = EXCLUDED.drivers,
          alignment_params = EXCLUDED.alignment_params,
          status = EXCLUDED.status,
          avg_error = EXCLUDED.avg_error,
          date_string = EXCLUDED.date_string,
          size_mb = EXCLUDED.size_mb,
          telemetry_compressed = EXCLUDED.telemetry_compressed
      `, [
        filename, trackId, trackName, sessionType, sessionTypeName,
        JSON.stringify(drivers), JSON.stringify(alignmentParams), status, avgError,
        dateString, sizeMB, compressedBuffer
      ]);

      console.log(`  Successfully imported ${filename}`);
    } catch (err) {
      console.error(`  Error importing ${file}:`, err.message);
    }
  }

  console.log("Migration complete!");
  await pool.end();
}

run().catch(err => {
  console.error("Migration failed:", err);
  pool.end();
});

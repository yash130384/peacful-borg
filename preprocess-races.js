// Using native global fetch (supported in modern Node.js)

async function run() {
  console.log("Starting race telemetry pre-processing...");
  try {
    const listRes = await fetch('http://localhost:3002/api/sessions');
    const sessions = await listRes.json();
    
    // Filter for races (API already filters for races, but we keep it clean)
    const races = sessions;
    
    console.log(`Found ${races.length} races to process.`);
    
    for (let i = 0; i < races.length; i++) {
      const race = races[i];
      console.log(`[${i + 1}/${races.length}] Processing: ${race.filename} (${race.sizeMB} MB)...`);
      const start = Date.now();
      try {
        const res = await fetch(`http://localhost:3002/api/sessions/${race.filename}`);
        if (res.ok) {
          console.log(`[${i + 1}/${races.length}] Finished ${race.filename} in ${((Date.now() - start)/1000).toFixed(1)}s`);
        } else {
          console.error(`[${i + 1}/${races.length}] Failed to process ${race.filename}: ${res.statusText}`);
        }
      } catch (e) {
        console.error(`[${i + 1}/${races.length}] Error processing ${race.filename}:`, e.message);
      }
    }
    console.log("Pre-processing complete! All races have been cached.");
  } catch (e) {
    console.error("Failed to connect to the backend server. Make sure it is running on http://localhost:3002", e.message);
  }
}

run();

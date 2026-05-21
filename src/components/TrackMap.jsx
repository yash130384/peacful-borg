import React, { useRef, useEffect, useState, useMemo } from 'react';

// Helper to get 3-letter driver abbreviation (e.g., "Max Verstappen" -> "VER")
export const getDriverAbbreviation = (name) => {
  if (!name) return 'UNK';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    return lastName.substring(0, 3).toUpperCase();
  }
  return name.substring(0, 3).toUpperCase();
};

const TrackMap = ({ 
  telemetryData, 
  drivers, 
  currentTime, 
  driver1Index, 
  driver2Index, 
  onSelectDriver,
  trackName,
  sessionFilename
}) => {
  const canvasRef = useRef(null);
  
  // Canvas Dimensions State
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  // Pan and Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [hoveredDriver, setHoveredDriver] = useState(null);

  // Layout & Raceline state
  const [trackLayout, setTrackLayout] = useState(null);
  const [raceline, setRaceline] = useState(null);
  const [followDriver, setFollowDriver] = useState(false);

  // Refs to store active camera parameters to avoid state updates on drag/scroll events
  const currentZoomRef = useRef(zoom);
  const currentPanRef = useRef(pan);

  // Keep refs in sync with React state
  useEffect(() => {
    currentZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    currentPanRef.current = pan;
  }, [pan]);

  // Set up ResizeObserver to size canvas dynamically to its parent layout container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const handleResize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w > 0 && h > 0) {
        setDimensions(prev => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch track layout and optimal raceline from backend endpoints
  useEffect(() => {
    if (!trackName || !sessionFilename) {
      setTrackLayout(null);
      setRaceline(null);
      return;
    }

    fetch(`/api/tracks/${encodeURIComponent(trackName)}?session=${encodeURIComponent(sessionFilename)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setTrackLayout(null);
        } else {
          setTrackLayout(data);
        }
      })
      .catch(err => {
        console.error('Error fetching track layout:', err);
        setTrackLayout(null);
      });

    fetch(`/api/racelines/${encodeURIComponent(trackName)}?session=${encodeURIComponent(sessionFilename)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setRaceline(null);
        } else {
          setRaceline(data.points);
        }
      })
      .catch(err => {
        console.error('Error fetching raceline:', err);
        setRaceline(null);
      });
  }, [trackName, sessionFilename]);

  // 1. Identify the reference driver (the one with the most telemetry points to define the track)
  const referenceDriverIdx = useMemo(() => {
    if (!telemetryData || Object.keys(telemetryData).length === 0) return null;
    let maxPoints = 0;
    let bestIdx = null;
    for (const [idx, points] of Object.entries(telemetryData)) {
      if (points.length > maxPoints) {
        maxPoints = points.length;
        bestIdx = parseInt(idx);
      }
    }
    return bestIdx;
  }, [telemetryData]);

  // 2. Extract track path coordinates from reference driver
  const trackPath = useMemo(() => {
    if (referenceDriverIdx === null || !telemetryData[referenceDriverIdx]) return [];
    return telemetryData[referenceDriverIdx].map(pt => ({ x: pt.x, z: pt.z }));
  }, [telemetryData, referenceDriverIdx]);

  // 3. Compute track bounds (centerline if available, otherwise reference driver telemetry)
  const bounds = useMemo(() => {
    const pts = (trackLayout && trackLayout.centerline && trackLayout.centerline.length > 0)
      ? trackLayout.centerline
      : trackPath;

    if (pts.length === 0) return { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    pts.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    });

    return { minX, maxX, minZ, maxZ };
  }, [trackLayout, trackPath]);

  // Interpolate driver status at the given time
  const getInterpolatedDriverState = (driverIdx, time) => {
    const samples = telemetryData[driverIdx];
    if (!samples || samples.length === 0) return null;

    if (time <= samples[0].t) return samples[0];
    if (time >= samples[samples.length - 1].t) return samples[samples.length - 1];

    // Binary search for surrounding samples
    let low = 0;
    let high = samples.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (samples[mid].t === time) {
        return samples[mid];
      } else if (samples[mid].t < time) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const s0 = samples[high];
    const s1 = samples[low];
    if (!s0) return s1;
    if (!s1) return s0;

    const ratio = (time - s0.t) / (s1.t - s0.t);
    return {
      x: s0.x + (s1.x - s0.x) * ratio,
      z: s0.z + (s1.z - s0.z) * ratio,
      speed: s0.speed + (s1.speed - s0.speed) * ratio,
      throttle: s0.throttle + (s1.throttle - s0.throttle) * ratio,
      brake: s0.brake + (s1.brake - s0.brake) * ratio,
      gear: s0.gear,
      drs: s0.drs,
      ers: s0.ers + (s1.ers - s0.ers) * ratio
    };
  };

  // Get current state of all active drivers
  const activeDriverStates = useMemo(() => {
    const states = [];
    drivers.forEach(driver => {
      const state = getInterpolatedDriverState(driver.index, currentTime);
      if (state) {
        states.push({
          ...driver,
          ...state
        });
      }
    });
    return states;
  }, [drivers, telemetryData, currentTime]);

  // Reset Zoom & Pan
  const handleResetView = () => {
    setFollowDriver(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Canvas Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ptsForScaling = (trackLayout && trackLayout.centerline && trackLayout.centerline.length > 0)
      ? trackLayout.centerline
      : trackPath;

    if (!canvas || ptsForScaling.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear with dark tech grid background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Auto-fit track coordinates to canvas
    const padding = 50;
    const trackWidth = bounds.maxX - bounds.minX;
    const trackHeight = bounds.maxZ - bounds.minZ;

    const baseScale = Math.min(
      (width - padding * 2) / (trackWidth || 1), 
      (height - padding * 2) / (trackHeight || 1)
    );

    const baseOffsetX = (width - trackWidth * baseScale) / 2;
    const baseOffsetY = (height - trackHeight * baseScale) / 2;

    // Setup active camera variables (handling follow driver)
    let activeZoom = zoom;
    let activePan = { ...pan };

    const d1 = activeDriverStates.find(d => d.index === driver1Index);
    if (followDriver && d1) {
      activeZoom = height / (200 * baseScale);
      
      const bx = baseOffsetX + (d1.x - bounds.minX) * baseScale;
      const bz = baseOffsetY + (d1.z - bounds.minZ) * baseScale;
      const cx = bx - width / 2;
      const cy = bz - height / 2;
      
      activePan = {
        x: -cx * activeZoom,
        y: -cy * activeZoom
      };
    }

    // Save current active camera settings to refs so user drag/zoom can resume fluidly
    currentZoomRef.current = activeZoom;
    currentPanRef.current = activePan;

    // Projection function
    const project = (x, z) => {
      const bx = baseOffsetX + (x - bounds.minX) * baseScale;
      const bz = baseOffsetY + (z - bounds.minZ) * baseScale;
      const cx = bx - width / 2;
      const cy = bz - height / 2;
      return {
        x: width / 2 + cx * activeZoom + activePan.x,
        y: height / 2 + cy * activeZoom + activePan.y
      };
    };

    ctx.save();

    // 4. Draw Track Ribbon or Fallback Line
    if (trackLayout && trackLayout.leftBorder && trackLayout.rightBorder && trackLayout.leftBorder.length > 0) {
      // Draw closed track asphalt ribbon
      ctx.beginPath();
      const startL = project(trackLayout.leftBorder[0].x, trackLayout.leftBorder[0].z);
      ctx.moveTo(startL.x, startL.y);
      for (let i = 1; i < trackLayout.leftBorder.length; i++) {
        const p = project(trackLayout.leftBorder[i].x, trackLayout.leftBorder[i].z);
        ctx.lineTo(p.x, p.y);
      }
      for (let i = trackLayout.rightBorder.length - 1; i >= 0; i--) {
        const p = project(trackLayout.rightBorder[i].x, trackLayout.rightBorder[i].z);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = '#0f172a'; // Deep asphalt grey
      ctx.fill();

      // Outer border stroke
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5 * activeZoom;
      ctx.stroke();

      // Centerline
      ctx.beginPath();
      trackLayout.centerline.forEach((pt, idx) => {
        const p = project(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1 * activeZoom;
      ctx.setLineDash([5 * activeZoom, 10 * activeZoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Fallback telemetry line path
      ctx.beginPath();
      trackPath.forEach((pt, idx) => {
        const { x, y } = project(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 10 * activeZoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 * activeZoom;
      ctx.setLineDash([5 * activeZoom, 10 * activeZoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Optimal Raceline
    if (raceline && raceline.length > 0) {
      ctx.beginPath();
      raceline.forEach((pt, idx) => {
        const p = project(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = '#22c55e'; // Bright green optimal path
      ctx.lineWidth = 1.8 * activeZoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Draw Start/Finish perpendicular line
    const sfPath = (trackLayout && trackLayout.centerline && trackLayout.centerline.length > 0)
      ? trackLayout.centerline
      : trackPath;

    if (sfPath.length > 1) {
      const pStart = project(sfPath[0].x, sfPath[0].z);
      const pNext = project(sfPath[1].x, sfPath[1].z);
      const dx = pNext.x - pStart.x;
      const dy = pNext.y - pStart.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const px = -dy / (len || 1);
      const py = dx / (len || 1);
      const lineLen = 8 * activeZoom;

      ctx.beginPath();
      ctx.moveTo(pStart.x - px * lineLen, pStart.y - py * lineLen);
      ctx.lineTo(pStart.x + px * lineLen, pStart.y + py * lineLen);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * activeZoom;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, 7 * activeZoom)}px 'Share Tech Mono'`;
      ctx.textAlign = 'left';
      ctx.fillText("S/F", pStart.x + px * (lineLen + 4), pStart.y + py * (lineLen + 4));
    }

    // 6. Draw Drivers with Team Colors and Glowing borders for D1/D2
    activeDriverStates.forEach(driver => {
      const { x, y } = project(driver.x, driver.z);
      const isD1 = driver.index === driver1Index;
      const isD2 = driver.index === driver2Index;
      const isHovered = hoveredDriver && hoveredDriver.index === driver.index;

      const TEAM_COLORS = {
        0: '#27F4D2', // Mercedes
        1: '#E80020', // Ferrari
        2: '#0600EF', // Red Bull
        3: '#00A3E0', // Williams
        4: '#006F62', // Aston Martin
        5: '#FF87B4', // Alpine
        6: '#469BFF', // RB / Racing Bulls
        7: '#B6BABD', // Haas
        8: '#FF8700', // McLaren
        9: '#52E252'  // Sauber
      };
      
      const teamColor = TEAM_COLORS[driver.teamId] || '#94a3b8';

      let radius = 5 * activeZoom;
      let color = teamColor;
      let glow = 0;
      let glowColor = '';
      let borderWidth = 0;
      let borderColor = '';

      if (isD1) {
        radius = 8 * activeZoom;
        glow = 15;
        glowColor = '#06b6d4'; // Cyan glow
        borderWidth = 3 * activeZoom;
        borderColor = '#06b6d4';
      } else if (isD2) {
        radius = 8 * activeZoom;
        glow = 15;
        glowColor = '#f43f5e'; // Magenta/Rose glow
        borderWidth = 3 * activeZoom;
        borderColor = '#f43f5e';
      } else if (isHovered) {
        radius = 7 * activeZoom;
        glow = 8;
        glowColor = '#ffffff';
        borderWidth = 1.5 * activeZoom;
        borderColor = '#ffffff';
      }

      ctx.save();
      if (glow > 0) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glow;
      }

      // Draw dot border & spacing
      if (borderWidth > 0) {
        ctx.beginPath();
        ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
        ctx.fillStyle = borderColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#070a13';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#070a13';
        ctx.fill();
      }

      // Center fill
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Label text
      const nameTag = getDriverAbbreviation(driver.name);
      ctx.fillStyle = isD1 ? '#06b6d4' : isD2 ? '#f43f5e' : isHovered ? '#ffffff' : '#94a3b8';
      ctx.font = `bold ${Math.max(10, (isD1 || isD2 ? 11 : 9) * Math.sqrt(activeZoom))}px 'Orbitron'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(nameTag, x, y - radius - borderWidth - 4);

      if (isHovered || isD1 || isD2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${Math.max(8, 8 * Math.sqrt(activeZoom))}px 'Share Tech Mono'`;
        ctx.fillText(`${Math.round(driver.speed)} km/h | G:${driver.gear}`, x, y - radius - borderWidth - 16);
      }
    });

    ctx.restore();
  }, [
    trackPath, 
    bounds, 
    activeDriverStates, 
    zoom, 
    pan, 
    driver1Index, 
    driver2Index, 
    hoveredDriver, 
    trackLayout, 
    raceline, 
    followDriver
  ]);

  // Handle Mouse Events for Zooming and Panning
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      const activePan = currentPanRef.current;
      dragStart.current = { x: e.clientX - activePan.x, y: e.clientY - activePan.y };
      if (followDriver) {
        setFollowDriver(false);
        setZoom(currentZoomRef.current);
        setPan(activePan);
      }
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const activeZoom = currentZoomRef.current;
    const activePan = currentPanRef.current;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    } else {
      // Find driver under cursor (distance threshold)
      const width = canvas.width;
      const height = canvas.height;
      
      const padding = 50;
      const trackWidth = bounds.maxX - bounds.minX;
      const trackHeight = bounds.maxZ - bounds.minZ;

      const baseScale = Math.min(
        (width - padding * 2) / (trackWidth || 1), 
        (height - padding * 2) / (trackHeight || 1)
      );
      const baseOffsetX = (width - trackWidth * baseScale) / 2;
      const baseOffsetY = (height - trackHeight * baseScale) / 2;

      const project = (wx, wz) => {
        const bx = baseOffsetX + (wx - bounds.minX) * baseScale;
        const bz = baseOffsetY + (wz - bounds.minZ) * baseScale;
        const cx = bx - width / 2;
        const cy = bz - height / 2;
        return { 
          x: width / 2 + cx * activeZoom + activePan.x, 
          y: height / 2 + cy * activeZoom + activePan.y 
        };
      };

      let found = null;
      for (const d of activeDriverStates) {
        const pos = project(d.x, d.z);
        const dist = Math.hypot(pos.x - sx, pos.y - sy);
        if (dist < 15) { // 15px radius threshold
          found = d;
          break;
        }
      }
      setHoveredDriver(found);
    }
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    
    // If not dragging far, treat as click
    if (hoveredDriver) {
      onSelectDriver(hoveredDriver.index);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const activeZoom = currentZoomRef.current;
    const activePan = currentPanRef.current;
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? activeZoom * zoomFactor : activeZoom / zoomFactor;
    const limitedZoom = Math.max(0.5, Math.min(15, newZoom));
    
    if (followDriver) {
      setFollowDriver(false);
    }
    setZoom(limitedZoom);
    setPan(activePan);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0d14] border border-[#1e293b] rounded-2xl overflow-hidden">
      {/* HUD Header overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="bg-[#0f172a]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[#1e293b] pointer-events-auto flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300 font-sans tracking-wide">2D TRACK STREAM</span>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setFollowDriver(!followDriver)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-sans transition duration-200 ${
              followDriver 
                ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20' 
                : 'bg-[#0f172a]/85 border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white'
            }`}
          >
            {followDriver ? 'FOLGEN AKTIV' : 'FAHRER FOLGEN'}
          </button>
          <button
            onClick={handleResetView}
            className="bg-[#0f172a]/85 border border-[#1e293b] hover:bg-[#1e293b] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition duration-200"
          >
            RESET VIEW
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full relative min-h-0">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Map Legend */}
      <div className="bg-[#070a13] px-4 py-2 border-t border-[#1e293b] flex flex-wrap gap-x-6 gap-y-2 justify-center text-[10px] font-sans text-slate-500 font-medium animate-fade-in">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shadow-sm shadow-[#06b6d4]/50"></span>
          <span className="text-slate-300 font-bold">DRIVER 1 (CYAN GLOW)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm shadow-[#f43f5e]/50"></span>
          <span className="text-slate-300 font-bold">DRIVER 2 (MAGENTA GLOW)</span>
        </div>
        <div className="text-[9px] text-slate-500 font-sans italic">
          Tip: Drag to pan, scroll wheel to zoom. Hover over any dot to see speed details. Click a dot to select.
        </div>
      </div>
    </div>
  );
};

export default TrackMap;

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

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
  sessionFilename,
  status,
  avgError,
  heatmapPoints = null,
  highlightedZone = null,
  focusedZone = null,
  coachingMode = false,
  driver1Time = 0,
  driver2Time = 0,
  driver1LapNum = 0,
  driver2LapNum = 0,
  showRaceline = true,
  showD1Trail = true,
  showD2Trail = true,
  followDriver = false,
  setFollowDriver = () => {},
  followZoomEnvelope = 100
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
    return telemetryData[referenceDriverIdx].map(pt => ({ x: pt.x, z: pt.z, lapDistance: pt.lapDistance }));
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

  // Lap-specific points for drawing trails in coaching mode
  const driver1LapPoints = useMemo(() => {
    if (!coachingMode || !telemetryData || driver1Index === null || driver1LapNum === null || driver1LapNum === undefined) return [];
    const pts = telemetryData[driver1Index] || [];
    return pts.filter(pt => pt.lapNum === driver1LapNum).sort((a, b) => a.lapDistance - b.lapDistance);
  }, [coachingMode, telemetryData, driver1Index, driver1LapNum]);

  const driver2LapPoints = useMemo(() => {
    if (!coachingMode || !telemetryData || driver2Index === null || driver2LapNum === null || driver2LapNum === undefined) return [];
    const pts = telemetryData[driver2Index] || [];
    return pts.filter(pt => pt.lapNum === driver2LapNum).sort((a, b) => a.lapDistance - b.lapDistance);
  }, [coachingMode, telemetryData, driver2Index, driver2LapNum]);

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
      ers: s0.ers + (s1.ers - s0.ers) * ratio,
      lapDistance: s0.lapDistance + (s1.lapDistance - s0.lapDistance) * ratio,
      lapNum: s0.lapNum
    };
  };

  // Get current state of all active drivers
  const activeDriverStates = useMemo(() => {
    if (coachingMode) {
      const states = [];
      
      // Driver 1 (Chosen driver)
      const d1 = drivers.find(d => d.index === driver1Index);
      if (d1) {
        const state1 = getInterpolatedDriverState(driver1Index, driver1Time);
        if (state1) {
          states.push({
            ...d1,
            ...state1,
            isD1: true,
            isD2: false
          });
        }
      }
      
      // Driver 2 (Reference driver / Best lap)
      if (driver2Index !== null) {
        const d2 = drivers.find(d => d.index === driver2Index);
        if (d2) {
          const state2 = getInterpolatedDriverState(driver2Index, driver2Time);
          if (state2) {
            states.push({
              ...d2,
              ...state2,
              isD1: false,
              isD2: true
            });
          }
        }
      }
      
      return states;
    }

    const states = [];
    drivers.forEach(driver => {
      const state = getInterpolatedDriverState(driver.index, currentTime);
      if (state) {
        states.push({
          ...driver,
          ...state,
          isD1: driver.index === driver1Index,
          isD2: driver.index === driver2Index
        });
      }
    });
    return states;
  }, [coachingMode, drivers, telemetryData, driver1Index, driver2Index, driver1Time, driver2Time, currentTime]);

  // Auto-focus on a selected track zone (e.g. corner)
  useEffect(() => {
    if (!focusedZone) {
      setFollowDriver(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    if (trackPath.length === 0) return;
    
    const { startDistance, endDistance } = focusedZone;
    
    // Filter trackPath points within this distance range
    let zonePts = [];
    if (startDistance <= endDistance) {
      zonePts = trackPath.filter(pt => pt.lapDistance >= startDistance && pt.lapDistance <= endDistance);
    } else {
      // Handles lap boundary wrap-around
      zonePts = trackPath.filter(pt => pt.lapDistance >= startDistance || pt.lapDistance <= endDistance);
    }
    
    if (zonePts.length === 0) return;
    
    // Calculate bounding box of coordinates in the zone
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    zonePts.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    });
    
    const wZone = maxX - minX;
    const hZone = maxZ - minZ;
    const cxZone = (minX + maxX) / 2;
    const czZone = (minZ + maxZ) / 2;
    
    const width = dimensions.width;
    const height = dimensions.height;
    
    const padding = 50;
    const trackWidth = bounds.maxX - bounds.minX;
    const trackHeight = bounds.maxZ - bounds.minZ;
    
    const baseScale = Math.min(
      (width - padding * 2) / (trackWidth || 1), 
      (height - padding * 2) / (trackHeight || 1)
    );
    
    const baseOffsetX = (width - trackWidth * baseScale) / 2;
    const baseOffsetY = (height - trackHeight * baseScale) / 2;
    
    // Calculate required scale to fit the bounding box with padding
    const targetScale = Math.min(
      (width - 160) / (wZone || 1),
      (height - 160) / (hZone || 1)
    );
    
    // Zoom factor relative to baseScale
    const targetZoom = Math.max(1.8, Math.min(6.0, targetScale / baseScale));
    
    // Project base coordinates of the zone center
    const bxC = baseOffsetX + (cxZone - bounds.minX) * baseScale;
    const bzC = baseOffsetY + (czZone - bounds.minZ) * baseScale;
    const cxBaseCenter = bxC - width / 2;
    const cyBaseCenter = bzC - height / 2;
    
    // Calculate target pan offsets to center the zone
    const targetPanX = -cxBaseCenter * targetZoom;
    const targetPanY = -cyBaseCenter * targetZoom;
    
    setFollowDriver(false);
    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  }, [focusedZone, trackPath, bounds, dimensions]);

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
      activeZoom = height / (followZoomEnvelope * baseScale);
      
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

      // Centerline or Heatmap (Only in normal mode)
      if (!coachingMode) {
        if (heatmapPoints && heatmapPoints.length > 0) {
          // Draw color-coded heatmap segments along centerline
          for (let i = 1; i < heatmapPoints.length; i++) {
            const p1 = project(heatmapPoints[i - 1].x, heatmapPoints[i - 1].z);
            const p2 = project(heatmapPoints[i].x, heatmapPoints[i].z);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = heatmapPoints[i].color || '#3b82f6';
            ctx.lineWidth = 4 * activeZoom;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        } else {
          // Default white dotted centerline
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
        }
      }
    } else {
      // Fallback path: Centerline or Heatmap
      if (heatmapPoints && heatmapPoints.length > 0 && !coachingMode) {
        // Draw colored segments on the fallback path
        for (let i = 1; i < heatmapPoints.length; i++) {
          const p1 = project(heatmapPoints[i - 1].x, heatmapPoints[i - 1].z);
          const p2 = project(heatmapPoints[i].x, heatmapPoints[i].z);
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = heatmapPoints[i].color || '#3b82f6';
          ctx.lineWidth = 4 * activeZoom;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
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
    }

    // Draw highlighted zone glow overlay if selected
    if (highlightedZone && heatmapPoints && heatmapPoints.length > 0) {
      ctx.save();
      // Draw neon cyan highlight line on top
      ctx.strokeStyle = '#22d3ee'; // bright cyan
      ctx.lineWidth = 8 * activeZoom;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      let drawing = false;
      for (let i = 0; i < heatmapPoints.length; i++) {
        const pt = heatmapPoints[i];
        const inRange = pt.lapDistance >= highlightedZone.startDistance && pt.lapDistance <= highlightedZone.endDistance;
        
        if (inRange) {
          const p = project(pt.x, pt.z);
          if (!drawing) {
            ctx.moveTo(p.x, p.y);
            drawing = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        } else {
          if (drawing) {
            ctx.stroke();
            ctx.beginPath();
            drawing = false;
          }
        }
      }
      if (drawing) {
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Draw Optimal Raceline (Ideallinie - Blue in coachingMode, Green in normal, Toggleable)
    if (showRaceline) {
      const linePoints = (raceline && raceline.length > 0)
        ? raceline
        : ((trackLayout && trackLayout.centerline && trackLayout.centerline.length > 0) ? trackLayout.centerline : []);
        
      if (linePoints.length > 0) {
        ctx.save();
        ctx.beginPath();
        linePoints.forEach((pt, idx) => {
          const p = project(pt.x, pt.z);
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = coachingMode ? '#3b82f6' : '#22c55e'; // Blue in coaching mode, green in normal mode
        ctx.lineWidth = coachingMode ? 1.5 : 2.0 * activeZoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
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
      ctx.lineWidth = coachingMode ? 2.0 : 3 * activeZoom;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${coachingMode ? 9 : Math.max(8, 7 * activeZoom)}px 'Share Tech Mono'`;
      ctx.textAlign = 'left';
      ctx.fillText("S/F", pStart.x + px * (lineLen + 4), pStart.y + py * (lineLen + 4));
    }

    // Draw Driver Trails in coachingMode (representing their lines growing during the lap)
    if (coachingMode) {
      const d1State = activeDriverStates.find(d => d.isD1);
      const d2State = activeDriverStates.find(d => d.isD2);
      const d1CurrentDist = d1State ? d1State.lapDistance : 0;
      const d2CurrentDist = d2State ? d2State.lapDistance : 0;

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

      // Draw Driver 1 driven line so far (Green)
      if (showD1Trail && driver1LapPoints.length > 0 && d1CurrentDist > 0) {
        ctx.save();
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < driver1LapPoints.length; i++) {
          const pt = driver1LapPoints[i];
          if (pt.lapDistance <= d1CurrentDist) {
            const p = project(pt.x, pt.z);
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            break;
          }
        }
        ctx.strokeStyle = '#22c55e'; // Green
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Driver 2 driven line so far (Team Color)
      if (showD2Trail && driver2LapPoints.length > 0 && d2CurrentDist > 0 && d2State) {
        ctx.save();
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < driver2LapPoints.length; i++) {
          const pt = driver2LapPoints[i];
          if (pt.lapDistance <= d2CurrentDist) {
            const p = project(pt.x, pt.z);
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            break;
          }
        }
        ctx.strokeStyle = TEAM_COLORS[d2State.teamId] || '#f43f5e'; // Team color
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. Draw Drivers with Team Colors and Glowing borders for D1/D2
    activeDriverStates.forEach(driver => {
      const { x, y } = project(driver.x, driver.z);
      const isD1 = coachingMode ? driver.isD1 : driver.index === driver1Index;
      const isD2 = coachingMode ? driver.isD2 : driver.index === driver2Index;
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

      if (coachingMode) {
        // Physical sizing: ~1.0m radius in world units (~2.0m width)
        radius = Math.max(3, 1.0 * baseScale * activeZoom);
        borderWidth = 1.5; // static border width
        
        if (isD1) {
          color = '#22c55e'; // Green
          borderColor = '#22c55e';
          glowColor = '#22c55e';
          glow = 5; // subtle glow
        } else if (isD2) {
          color = teamColor; // Team color
          borderColor = teamColor;
          glowColor = teamColor;
          glow = 5;
        }
      } else {
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

        // Center fill (slightly smaller than radius to create a black spacer gap)
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, radius - 0.8), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#070a13';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();

      // Label text
      let nameTag = getDriverAbbreviation(driver.name);
      if (coachingMode) {
        if (isD1) {
          nameTag = `${nameTag} (R${driver1LapNum})`;
        } else if (isD2) {
          nameTag = `${nameTag} (BEST)`;
        }
      }
      
      ctx.fillStyle = isD1 
        ? (coachingMode ? '#22c55e' : '#06b6d4') 
        : isD2 
          ? (coachingMode ? teamColor : '#f43f5e') 
          : isHovered 
            ? '#ffffff' 
            : '#94a3b8';
      ctx.font = coachingMode 
        ? "bold 10px 'Orbitron'" 
        : `bold ${Math.max(10, (isD1 || isD2 ? 11 : 9) * Math.sqrt(activeZoom))}px 'Orbitron'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(nameTag, x, y - radius - borderWidth - 4);

      if (isHovered || isD1 || isD2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = coachingMode 
          ? "9px 'Share Tech Mono'" 
          : `${Math.max(8, 8 * Math.sqrt(activeZoom))}px 'Share Tech Mono'`;
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
    followDriver,
    coachingMode,
    driver1LapNum,
    driver2LapNum,
    showRaceline,
    showD1Trail,
    showD2Trail,
    driver1LapPoints,
    driver2LapPoints,
    followZoomEnvelope
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
      const activeZoom = currentZoomRef.current;
      if (activeZoom > 1.0) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const maxPanX = (canvas.width / 2) * (activeZoom - 1);
        const maxPanY = (canvas.height / 2) * (activeZoom - 1);
        setPan({
          x: Math.max(-maxPanX, Math.min(maxPanX, dx)),
          y: Math.max(-maxPanY, Math.min(maxPanY, dy))
        });
      }
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
    
    // Clamp minimum zoom to 1.0 to fit the track exactly and prevent losing it
    const limitedZoom = Math.max(1.0, Math.min(15, newZoom));
    
    if (followDriver) {
      setFollowDriver(false);
    }
    setZoom(limitedZoom);
    
    if (limitedZoom === 1.0) {
      setPan({ x: 0, y: 0 });
    } else {
      const canvas = canvasRef.current;
      const w = canvas ? canvas.width : dimensions.width;
      const h = canvas ? canvas.height : dimensions.height;
      const maxPanX = (w / 2) * (limitedZoom - 1);
      const maxPanY = (h / 2) * (limitedZoom - 1);
      setPan({
        x: Math.max(-maxPanX, Math.min(maxPanX, activePan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, activePan.y))
      });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0d14] border border-[#1e293b] rounded-2xl overflow-hidden">
      {/* HUD Header overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="bg-[#0f172a]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[#1e293b] pointer-events-auto flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300 font-sans tracking-wide">2D TRACK STREAM</span>
          {status && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-[#1e293b]/80 h-3.5">
              {status === 'VERIFIED' && (
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2 py-0.5 rounded text-[9px] font-orbitron font-extrabold tracking-wider uppercase shadow-[0_0_8px_rgba(16,185,129,0.12)]">
                  <ShieldCheck size={10} className="text-emerald-400" />
                  VERIFIZIERT {avgError !== null && `(~${avgError.toFixed(1)}m)`}
                </span>
              )}
              {status === 'MISMATCH' && (
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/35 px-2 py-0.5 rounded text-[9px] font-orbitron font-extrabold tracking-wider uppercase shadow-[0_0_8px_rgba(245,158,11,0.12)] animate-pulse">
                  <ShieldAlert size={10} className="text-amber-500" />
                  WARNUNG {avgError !== null && `(~${avgError.toFixed(1)}m)`}
                </span>
              )}
              {status === 'FALLBACK' && (
                <span className="flex items-center gap-1 bg-slate-800/40 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-[9px] font-orbitron font-extrabold tracking-wider uppercase">
                  <Shield size={10} className="text-slate-400" />
                  FALLBACK (KEINE CSV)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 pointer-events-auto">
          {coachingMode && (
            <button
              onClick={() => setShowRaceline(!showRaceline)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-sans transition duration-200 ${
                showRaceline 
                  ? 'bg-blue-500/25 border-blue-500/55 text-blue-400 hover:bg-blue-500/35 hover:text-white shadow-[0_0_8px_rgba(59,130,246,0.2)]' 
                  : 'bg-[#0f172a]/85 border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              {showRaceline ? 'IDEALLINIE BLENDEN' : 'IDEALLINIE ANZEIGEN'}
            </button>
          )}
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
        {coachingMode ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-sm shadow-[#22c55e]/50"></span>
              <span className="text-slate-300 font-bold">GEWÄHLTER FAHRER (GRÜN)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm" style={{ backgroundColor: activeDriverStates.find(d => d.isD2)?.teamColor || '#f43f5e' }}></span>
              <span className="text-slate-300 font-bold">BESTE RUNDE (TEAMFARBE)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shadow-sm shadow-[#06b6d4]/50"></span>
              <span className="text-slate-300 font-bold">DRIVER 1 (CYAN GLOW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm shadow-[#f43f5e]/50"></span>
              <span className="text-slate-300 font-bold">DRIVER 2 (MAGENTA GLOW)</span>
            </div>
          </>
        )}
        <div className="text-[9px] text-slate-500 font-sans italic">
          Tip: Drag to pan, scroll wheel to zoom. Hover over any dot to see speed details. {coachingMode ? '' : 'Click a dot to select.'}
        </div>
      </div>
    </div>
  );
};

export default TrackMap;

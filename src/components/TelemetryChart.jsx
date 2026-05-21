import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom plugin to draw vertical playback cursor line
const verticalCursorPlugin = {
  id: 'verticalCursor',
  afterDraw: (chart, args, options) => {
    const activeVal = options?.value ?? chart.config.options.plugins.verticalCursor?.value ?? chart.options?.plugins?.verticalCursor?.value;
    if (activeVal === undefined || activeVal === null) return;

    const xAxis = chart.scales.x;
    const yAxis = chart.scales.y;
    if (!xAxis || !yAxis) return;

    const xPixel = xAxis.getPixelForValue(activeVal);
    if (xPixel >= xAxis.left && xPixel <= xAxis.right) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xPixel, yAxis.top);
      ctx.lineTo(xPixel, yAxis.bottom);
      
      // Draw neon indicator line
      ctx.strokeStyle = '#38bdf8'; // Sky blue neon
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      
      // Draw a handle at the top of the cursor line
      ctx.beginPath();
      ctx.arc(xPixel, yAxis.top, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      
      ctx.restore();
    }
  }
};

// Register the custom cursor plugin
ChartJS.register(verticalCursorPlugin);

const TelemetryChart = ({ 
  driverName, 
  telemetry, 
  currentTime, 
  onScrubTime 
}) => {
  const chartRef = useRef(null);
  const [viewMode, setViewMode] = useState('lap'); // 'lap' (current lap distance), 'window' (60s sliding window), or 'full' (full race)
  const windowSize = 60; // 60 seconds

  // Find telemetry point closest to currentTime to show stats and determine active lap
  const activePt = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return null;
    let closest = telemetry[0];
    let minDist = Math.abs(telemetry[0].t - currentTime);
    
    // Quick search
    for (let i = 0; i < telemetry.length; i++) {
      const dist = Math.abs(telemetry[i].t - currentTime);
      if (dist < minDist) {
        minDist = dist;
        closest = telemetry[i];
      }
    }
    return closest;
  }, [telemetry, currentTime]);

  const currentLapNum = activePt ? activePt.lapNum : 1;

  // Handle click on chart to scrub time
  const handleChartClick = (event) => {
    const chart = chartRef.current;
    if (!chart) return;

    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const xAxis = chart.scales.x;
    if (!xAxis) return;

    const clickVal = xAxis.getValueForPixel(x);
    if (clickVal >= xAxis.min && clickVal <= xAxis.max) {
      if (viewMode === 'lap') {
        // Find the telemetry point in the current lap closest to this lapDistance
        const lapPts = telemetry.filter(pt => pt.lapNum === currentLapNum);
        if (lapPts.length > 0) {
          let closest = lapPts[0];
          let minDist = Math.abs(lapPts[0].lapDistance - clickVal);
          for (let i = 1; i < lapPts.length; i++) {
            const dist = Math.abs(lapPts[i].lapDistance - clickVal);
            if (dist < minDist) {
              minDist = dist;
              closest = lapPts[i];
            }
          }
          onScrubTime(closest.t);
        }
      } else {
        onScrubTime(Math.max(0, clickVal));
      }
    }
  };

  // Process data based on selected view mode
  const chartData = useMemo(() => {
    if (!telemetry || telemetry.length === 0) {
      return { datasets: [] };
    }

    let filteredData = telemetry;

    if (viewMode === 'lap') {
      filteredData = telemetry.filter(pt => pt.lapNum === currentLapNum);
    } else if (viewMode === 'window') {
      const halfWindow = windowSize / 2;
      const minTime = Math.max(0, currentTime - halfWindow);
      const maxTime = minTime + windowSize;
      
      filteredData = telemetry.filter(pt => pt.t >= minTime && pt.t <= maxTime);
    } else {
      // Full session downsampling to keep Chart.js rendering fast (< 1500 points)
      const maxPoints = 1200;
      if (telemetry.length > maxPoints) {
        const step = Math.ceil(telemetry.length / maxPoints);
        filteredData = [];
        for (let i = 0; i < telemetry.length; i += step) {
          filteredData.push(telemetry[i]);
        }
      }
    }

    // Map into datasets (X-axis is distance for 'lap' mode, time for other modes)
    const useDistance = viewMode === 'lap';
    const speeds = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.speed }));
    const throttles = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.throttle * 100 }));
    const brakes = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.brake * 100 }));
    const gears = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.gear }));
    const drs = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.drs * 100 }));
    const ers = filteredData.map(pt => ({ x: useDistance ? pt.lapDistance : pt.t, y: pt.ers }));

    return {
      datasets: [
        {
          label: 'Speed (km/h)',
          data: speeds,
          borderColor: '#3b82f6', // Dodger Blue
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2.5,
          yAxisID: 'ySpeed',
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Throttle (%)',
          data: throttles,
          borderColor: '#10b981', // Emerald
          borderWidth: 2,
          yAxisID: 'yPercent',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Brake (%)',
          data: brakes,
          borderColor: '#ef4444', // Red
          borderWidth: 2,
          yAxisID: 'yPercent',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'ERS (%)',
          data: ers,
          borderColor: '#a855f7', // Purple/Magenta
          borderWidth: 1.5,
          yAxisID: 'yPercent',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'DRS (%)',
          data: drs,
          borderColor: '#eab308', // Yellow
          borderWidth: 1.5,
          yAxisID: 'yPercent',
          stepped: 'middle',
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Gear',
          data: gears,
          borderColor: '#f8fafc', // Slate White
          borderWidth: 1.5,
          yAxisID: 'yGear',
          stepped: 'before',
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    };
  }, [telemetry, currentTime, viewMode]);

  const maxTrackDistance = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return 5000;
    let maxD = 0;
    for (let i = 0; i < telemetry.length; i++) {
      if (telemetry[i].lapDistance > maxD) {
        maxD = telemetry[i].lapDistance;
      }
    }
    return maxD || 5000;
  }, [telemetry]);

  // Options configuration
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for real-time scrub performance
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: {
            family: "'Share Tech Mono', monospace",
            size: 11
          },
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        titleFont: {
          family: "'Orbitron', sans-serif",
          weight: 'bold'
        },
        bodyFont: {
          family: "'Share Tech Mono', monospace"
        },
        callbacks: {
          title: (context) => {
            const xVal = context[0].parsed.x;
            if (viewMode === 'lap') {
              return `LAP DISTANCE: ${Math.round(xVal)}m`;
            }
            const mins = Math.floor(xVal / 60);
            const secs = (xVal % 60).toFixed(3);
            return `TIME: ${mins}:${secs.padStart(6, '0')}`;
          },
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.datasetIndex === 0) { // Speed
                label += `${Math.round(context.parsed.y)} km/h`;
              } else if (context.datasetIndex === 5) { // Gear
                label += context.parsed.y === 0 ? 'N' : context.parsed.y === -1 ? 'R' : context.parsed.y;
              } else { // Percentages
                label += `${Math.round(context.parsed.y)}%`;
              }
            }
            return label;
          }
        }
      },
      verticalCursor: {
        value: viewMode === 'lap' ? (activePt ? activePt.lapDistance : 0) : currentTime
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
          drawTicks: true
        },
        ticks: {
          color: '#64748b',
          font: {
            family: "'Share Tech Mono', monospace"
          },
          callback: (value) => {
            if (viewMode === 'lap') {
              return `${Math.round(value)}m`;
            }
            const mins = Math.floor(value / 60);
            const secs = Math.floor(value % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          }
        },
        // Force the sliding window domain or lap distance domain
        min: viewMode === 'lap' ? 0 : (viewMode === 'window' ? Math.max(0, currentTime - windowSize / 2) : undefined),
        max: viewMode === 'lap' ? maxTrackDistance : (viewMode === 'window' ? Math.max(0, currentTime - windowSize / 2) + windowSize : undefined)
      },
      ySpeed: {
        type: 'linear',
        position: 'left',
        min: 0,
        max: 360,
        grid: {
          color: 'rgba(51, 65, 85, 0.4)'
        },
        ticks: {
          color: '#3b82f6',
          font: {
            family: "'Share Tech Mono', monospace"
          },
          callback: (value) => `${value} km/h`
        }
      },
      yPercent: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 105,
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: '#10b981',
          font: {
            family: "'Share Tech Mono', monospace"
          },
          callback: (value) => `${value}%`
        }
      },
      yGear: {
        type: 'linear',
        position: 'right',
        min: -1,
        max: 8,
        display: false, // Keep scales separated, hide gear axis visual
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  return (
    <div className="bg-[#0f172a]/70 backdrop-blur-md border border-[#1e293b] rounded-2xl p-4 flex flex-col h-[280px]">
      {/* Telemetry Dashboard Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-extrabold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2.5 py-1 rounded">
            {driverName}
          </span>
          {activePt && (
            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <span className="text-amber-400 font-bold">
                LAP: {activePt.lapNum}
              </span>
              <span className="hidden sm:inline">
                SPEED: <strong className="text-blue-400">{Math.round(activePt.speed)}</strong> km/h
              </span>
              <span>
                GEAR: <strong className="text-white">{activePt.gear <= 0 ? (activePt.gear === 0 ? 'N' : 'R') : activePt.gear}</strong>
              </span>
              <span>
                GAS: <strong className="text-emerald-400">{Math.round(activePt.throttle * 100)}%</strong>
              </span>
              <span>
                BRAKE: <strong className="text-red-400">{Math.round(activePt.brake * 100)}%</strong>
              </span>
              <span className="hidden sm:inline">
                ERS: <strong className="text-purple-400">{Math.round(activePt.ers)}%</strong>
              </span>
            </div>
          )}
        </div>

        {/* View Mode Selectors */}
        <div className="flex bg-[#070a13] border border-[#1e293b] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('lap')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition ${
              viewMode === 'lap' 
                ? 'bg-[#1e293b] text-white shadow' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            CURRENT LAP
          </button>
          <button
            onClick={() => setViewMode('window')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition ${
              viewMode === 'window' 
                ? 'bg-[#1e293b] text-white shadow' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            60S WINDOW
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition ${
              viewMode === 'full' 
                ? 'bg-[#1e293b] text-white shadow' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            FULL SESSION
          </button>
        </div>
      </div>

      {/* Line Chart */}
      <div className="flex-1 min-h-0 relative cursor-crosshair">
        {telemetry && telemetry.length > 0 ? (
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            onClick={handleChartClick}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-sans italic">
            Telemetry data loading or unavailable...
          </div>
        )}
      </div>
    </div>
  );
};

export default TelemetryChart;

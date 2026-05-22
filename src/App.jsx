import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  Activity, 
  Calendar, 
  User, 
  Clock,
  ChevronRight,
  Database,
  Layers,
  Info,
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import TrackMap, { getDriverAbbreviation } from './components/TrackMap';
import TelemetryChart from './components/TelemetryChart';
import DriverCoach from './components/DriverCoach';

// Helper to format time into MM:SS.FFF
const formatTelemetryTime = (timeInSecs) => {
  if (isNaN(timeInSecs)) return '00:00.000';
  const mins = Math.floor(timeInSecs / 60);
  const secs = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// Helper to render high-end coordinate validation status badges
const renderValidationBadge = (status, avgError) => {
  const errorText = avgError !== null && avgError !== undefined ? ` (~${avgError.toFixed(1)}m)` : '';
  
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-orbitron font-extrabold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(16,185,129,0.12)] uppercase">
        <ShieldCheck size={10} className="text-emerald-400" />
        Verifiziert{errorText}
      </span>
    );
  }
  
  if (status === 'MISMATCH') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-orbitron font-extrabold tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/35 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.12)] uppercase animate-pulse">
        <ShieldAlert size={10} className="text-amber-500" />
        Fehlpassung{errorText}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-orbitron font-extrabold tracking-wider bg-slate-800/40 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded uppercase">
      <Shield size={10} className="text-slate-400" />
      Fallback-Pfad (keine CSV)
    </span>
  );
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionFilename, setSelectedSessionFilename] = useState('');
  const [sessionData, setSessionData] = useState(null);
  
  // Navigation State: 'list' (overview grid) or 'race' (detailed viz)
  const [currentView, setCurrentView] = useState('list');
  
  // Loading & Error States
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  // Playback Control States
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 5x, 10x, 20x

  // Driver Selection
  const [driver1Index, setDriver1Index] = useState(null);
  const [driver2Index, setDriver2Index] = useState(null);

  // Fetch Session list on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(`Failed to load sessions: ${errorMsg}`);
      }
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
      setError(`Backend Connection Error: Make sure your server is running on port 3002. (${err.message})`);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectSession = async (filename) => {
    setSelectedSessionFilename(filename);
    setLoadingData(true);
    setIsPlaying(false);
    setSessionData(null);
    setDriver1Index(null);
    setDriver2Index(null);
    setCurrentTime(0);
    setError(null);
    setCurrentView('race'); // Transition to Race view immediately

    try {
      const response = await fetch(`/api/sessions/${filename}`);
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(`Failed to parse session telemetry: ${errorMsg}`);
      }
      const data = await response.json();
      setSessionData(data);
      
      // Auto-select first active driver as Driver 1
      if (data.drivers && data.drivers.length > 0) {
        // Find human driver if exists, otherwise first driver
        const humanDriver = data.drivers.find(d => d.isHuman);
        if (humanDriver) {
          setDriver1Index(humanDriver.index);
        } else {
          setDriver1Index(data.drivers[0].index);
        }
      }
    } catch (err) {
      console.error(err);
      setError(`Error parsing telemetry file: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const handleBackToOverview = () => {
    setIsPlaying(false);
    setError(null);
    setCurrentView('list');
  };


  // Compute session timing boundaries
  const { minTime, maxTime } = useMemo(() => {
    if (!sessionData || !sessionData.telemetry) return { minTime: 0, maxTime: 0 };
    
    let minT = Infinity;
    let maxT = 0;
    
    for (const pts of Object.values(sessionData.telemetry)) {
      if (pts.length > 0) {
        if (pts[0].t < minT) minT = pts[0].t;
        if (pts[pts.length - 1].t > maxT) maxT = pts[pts.length - 1].t;
      }
    }
    
    return {
      minTime: minT === Infinity ? 0 : minT,
      maxTime: maxT
    };
  }, [sessionData]);

  // Set current time to minTime when data is loaded
  useEffect(() => {
    if (sessionData) {
      setCurrentTime(minTime);
    }
  }, [sessionData, minTime]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let frameId;

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // time elapsed in seconds
      lastTime = now;

      setCurrentTime(prev => {
        const next = prev + dt * playSpeed;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playSpeed, maxTime]);

  // Find Driver telemetry arrays
  const driver1Telemetry = useMemo(() => {
    if (driver1Index === null || !sessionData) return null;
    return sessionData.telemetry[driver1Index] || null;
  }, [sessionData, driver1Index]);

  const driver2Telemetry = useMemo(() => {
    if (driver2Index === null || !sessionData) return null;
    return sessionData.telemetry[driver2Index] || null;
  }, [sessionData, driver2Index]);

  // Active driver information objects
  const driver1Info = useMemo(() => {
    if (driver1Index === null || !sessionData) return null;
    return sessionData.drivers.find(d => d.index === driver1Index) || null;
  }, [sessionData, driver1Index]);

  const driver2Info = useMemo(() => {
    if (driver2Index === null || !sessionData) return null;
    return sessionData.drivers.find(d => d.index === driver2Index) || null;
  }, [sessionData, driver2Index]);

  // Handle map selection
  const handleMapSelectDriver = (idx) => {
    if (driver1Index === idx) return; // Already driver 1
    if (driver2Index === idx) {
      // Clear or swap
      setDriver2Index(null);
    } else {
      // Set as driver 2 if driver 1 exists, otherwise driver 1
      if (driver1Index === null) {
        setDriver1Index(idx);
      } else {
        setDriver2Index(idx);
      }
    }
  };

  return (
    <div className="h-screen lg:h-screen lg:max-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white overflow-y-auto lg:overflow-hidden">
      {/* Top Cyber HUD Header */}
      <header className="bg-[#0f172a]/70 backdrop-blur-md border-b border-[#1e293b] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="font-orbitron font-extrabold text-white text-lg italic tracking-tighter">F1</span>
          </div>
          <div>
            <h1 className="font-orbitron text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              TELEMETRY CORE
            </h1>
            <p className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">
              GRID VISUALIZER v2.5 // F1 2025
            </p>
          </div>
        </div>

        {currentView !== 'list' && sessionData ? (
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleBackToOverview}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[#334155]/60 hover:border-sky-500/50 rounded-xl text-xs font-sans font-bold text-slate-300 hover:text-white transition duration-200 shadow-md hover:shadow-sky-500/10 active:scale-95"
            >
              <ArrowLeft size={14} className="text-sky-400" />
              <span>Zurück zur Übersicht</span>
            </button>

            {/* View Mode Tabs (Simulation vs Coaching) */}
            <div className="flex bg-[#070a13] border border-[#1e293b] rounded-xl p-1">
              <button
                onClick={() => setCurrentView('race')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition duration-150 ${
                  currentView === 'race'
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play size={12} className={currentView === 'race' ? 'text-slate-950' : 'text-sky-400'} />
                <span>Live-Simulation</span>
              </button>
              <button
                onClick={() => setCurrentView('coach')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition duration-150 ${
                  currentView === 'coach'
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={12} className={currentView === 'coach' ? 'text-slate-950' : 'text-rose-400'} />
                <span>Fahrer-Coaching</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-[#070a13]/80 px-4 py-2 rounded-xl border border-[#1e293b] text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Layers size={14} className="text-sky-400" />
                <span>TRACK: <strong className="text-slate-100">{sessionData.trackName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Activity size={14} className="text-rose-400" />
                <span>SESSION: <strong className="text-slate-100">{sessionData.sessionTypeName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database size={14} className="text-amber-400" />
                <span>DRIVERS: <strong className="text-slate-100">{sessionData.drivers.length}</strong></span>
              </div>
              
              {sessionData.status && (
                <div className="flex items-center gap-1.5 pl-4 border-l border-[#1e293b] h-4">
                  {sessionData.status === 'VERIFIED' && (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-orbitron font-extrabold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      Verifizierte Streckenausrichtung {sessionData.avgError !== null && `(~${sessionData.avgError.toFixed(1)}m)`}
                    </span>
                  )}
                  {sessionData.status === 'MISMATCH' && (
                    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-orbitron font-extrabold tracking-wider uppercase shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-pulse">
                      <ShieldAlert size={12} className="text-amber-500" />
                      Warnung: Streckenabweichung {sessionData.avgError !== null && `(~${sessionData.avgError.toFixed(1)}m)`}
                    </span>
                  )}
                  {sessionData.status === 'FALLBACK' && (
                    <span className="flex items-center gap-1 bg-slate-800/40 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-[10px] font-orbitron font-extrabold tracking-wider uppercase">
                      <Shield size={12} className="text-slate-400" />
                      Fallback-Pfad (keine CSV)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-[#64748b] hidden md:block">F1 2025 Game Telemetry Ingestion Tool</div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {currentView === 'list' ? (
          /* LIST VIEW: Full width grid of session cards */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar session-grid-container">
            <div className="session-grid-header">
              <div>
                <h2 className="text-xl md:text-2xl font-orbitron font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                  RENN-ÜBERSICHT
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  Wählen Sie ein aufgezeichnetes F1 2025 Rennen aus der Liste aus, um die detaillierten Telemetrie- und Rundenanalysen zu starten.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] px-4 py-2 rounded-xl text-xs font-mono">
                <Database size={14} className="text-sky-400" />
                <span className="text-slate-400">Gefundene Rennen: <strong className="text-slate-100">{sessions.length}</strong></span>
              </div>
            </div>

            {loadingSessions ? (
              <div className="py-20 text-center text-sm text-slate-400 font-mono flex flex-col items-center justify-center gap-4">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
                <div>Scanne Verzeichnis nach F1-Rennen...</div>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 space-y-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 font-semibold">
                  <Info size={18} className="text-red-500" />
                  <span>Verbindungsfehler</span>
                </div>
                <p className="font-mono text-xs leading-relaxed">{error}</p>
                <button 
                  onClick={fetchSessions}
                  className="w-full py-2.5 bg-red-500/25 hover:bg-red-500/40 text-red-100 rounded-xl transition font-semibold text-xs uppercase tracking-wider"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center text-sm text-slate-500 font-mono italic border border-dashed border-[#1e293b] rounded-2xl max-w-xl mx-auto p-8 space-y-4">
                <Info size={32} className="mx-auto text-slate-600" />
                <p>Keine F1-Rennen (.bin-Dateien) im Verzeichnis gefunden:</p>
                <div className="text-xs break-all text-slate-600 bg-[#070a13] p-3 rounded-lg border border-[#1e293b]">
                  /UDP Player/REserve/
                </div>
              </div>
            ) : (
              <div className="session-grid">
                {sessions.map((session) => {
                  return (
                    <div
                      key={session.filename}
                      onClick={() => handleSelectSession(session.filename)}
                      className="session-card"
                    >
                      <div className="session-card-glow"></div>
                      
                      <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-between">
                        {/* Card Top */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold font-mono tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase">
                              {session.sessionType || 'RACE'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{session.sizeMB} MB</span>
                          </div>

                          <h3 className="font-orbitron font-extrabold text-lg text-slate-100 group-hover:text-sky-400 transition duration-200">
                            {session.trackName}
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate mb-2">{session.filename}</p>
                          <div className="flex items-center mt-1.5">
                            {renderValidationBadge(session.status, session.avgError)}
                          </div>
                        </div>
                        
                        {/* Meta Info */}
                        <div className="session-card-meta">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
                            <span>{session.dateString.split(' ')[0] || 'Unbekannt'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Clock size={12} className="text-slate-500" />
                            <span>{session.dateString.split(' ')[1] || 'UTC'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="session-card-footer">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            session.isProcessed ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'
                          }`}></span>
                          <span className="text-[9px] font-bold tracking-wider font-mono text-slate-400 uppercase">
                            {session.isProcessed ? 'CACHED' : 'RAW FILE'}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold font-orbitron text-sky-400 flex items-center gap-0.5">
                          ÖFFNEN →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* RACE VIEW: Full screen telemetry dashboard */
          <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 gap-6 custom-scrollbar">
            {loadingData ? (
              /* Telemetry Data Ingestion Screen */
              <div className="flex-1 bg-[#0f172a]/30 border border-[#1e293b] rounded-3xl flex flex-col items-center justify-center p-8 space-y-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center font-orbitron font-extrabold text-sm italic text-sky-400">
                    RPM
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-orbitron font-bold text-lg text-slate-100 tracking-wide">
                    INGESTING SESSION TELEMETRY
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md font-sans leading-relaxed">
                    Parsing binary UDP packet stream and downsampling driver telemetry (30Hz humans, 5Hz AI). This process takes a few seconds on the first load and creates a cached JSON output.
                  </p>
                  <div className="inline-block mt-4 px-3 py-1 bg-[#070a13] border border-[#1e293b] rounded-full text-[10px] font-mono text-emerald-400">
                    Reading byte streams...
                  </div>
                </div>
              </div>
            ) : !sessionData ? (
              /* Blank state or error state */
              <div className="flex-1 bg-[#0f172a]/30 border border-dashed border-[#1e293b] rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Info size={40} className="text-slate-600" />
                <div className="space-y-1">
                  <h3 className="font-orbitron font-semibold text-sm text-slate-300">
                    NO SESSION LOADED
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs font-sans">
                    Please select a session from the list on the left side to begin analyzing live 2D tracks and comparing driver telemetry.
                  </p>
                </div>
              </div>
            ) : currentView === 'coach' ? (
              <DriverCoach
                sessionData={sessionData}
                onBack={handleBackToOverview}
              />
            ) : (
              /* Loaded Session Dashboard */
              <div className="flex flex-col gap-6 w-full flex-1">
                {/* TOP SECTION: Race Viz & Control Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
                  
                  {/* Left: 2D Track Map (8 columns) */}
                  <div className="lg:col-span-8 flex flex-col gap-4 bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl min-h-[380px] lg:h-[420px]">
                    <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-orbitron font-extrabold tracking-wider text-slate-200">
                          2D RACE STREAM ({sessionData.trackName})
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        LAP DATA RUNNING // {formatTelemetryTime(currentTime - minTime)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-[#1e293b]/50">
                      <TrackMap
                        telemetryData={sessionData.telemetry}
                        drivers={sessionData.drivers}
                        currentTime={currentTime}
                        driver1Index={driver1Index}
                        driver2Index={driver2Index}
                        onSelectDriver={handleMapSelectDriver}
                        trackName={sessionData.trackName}
                        sessionFilename={sessionData.filename}
                        status={sessionData.status}
                        avgError={sessionData.avgError}
                      />
                    </div>
                  </div>

                  {/* Right: Telemetry Controls & Drivers (4 columns) */}
                  <div className="lg:col-span-4 flex flex-col gap-4 bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl min-h-[380px] lg:h-[420px]">
                    
                    <div className="pb-2 border-b border-[#1e293b]">
                      <h3 className="text-xs font-orbitron font-extrabold tracking-wide text-slate-200 uppercase">
                        SESSION CONTROL PANEL
                      </h3>
                    </div>

                    {/* Playback controls */}
                    <div className="flex flex-col gap-3 bg-[#070a13] p-3 rounded-xl border border-[#1e293b]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold font-sans tracking-wide text-slate-400 uppercase">
                          Playback Controls
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Speed: {playSpeed}x
                        </span>
                      </div>

                      {/* Play / Pause / Reset / Speed */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg transition duration-200 ${
                            isPlaying 
                              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10' 
                              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/10'
                          }`}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
                        </button>
                        <button
                          onClick={() => {
                            setIsPlaying(false);
                            setCurrentTime(minTime);
                          }}
                          className="w-9 h-9 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition flex items-center justify-center border border-[#334155]/50"
                          title="Reset to Start"
                        >
                          <RotateCcw size={14} />
                        </button>

                        {/* Speeds buttons inline */}
                        <div className="flex flex-1 bg-[#0f172a] border border-[#1e293b] rounded-lg p-0.5 justify-around">
                          {[1, 2, 5, 10, 20].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaySpeed(speed)}
                              className={`px-2 py-1 rounded text-[9px] font-bold transition ${
                                playSpeed === speed 
                                  ? 'bg-[#1e293b] text-sky-400 border border-[#334155]' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Scrub slider */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] font-mono text-slate-500 min-w-[40px] text-right">
                          {formatTelemetryTime(currentTime - minTime)}
                        </span>
                        <input
                          type="range"
                          min={minTime}
                          max={maxTime}
                          step={0.01}
                          value={currentTime}
                          onChange={(e) => {
                            setIsPlaying(false);
                            setCurrentTime(parseFloat(e.target.value));
                          }}
                          className="flex-1 h-1 bg-[#0f172a] border border-[#1e293b] rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <span className="text-[9px] font-mono text-slate-500 min-w-[40px]">
                          {formatTelemetryTime(maxTime - minTime)}
                        </span>
                      </div>
                    </div>

                    {/* Competitor Selector dropdowns */}
                    <div className="flex flex-col gap-3 flex-1 justify-center">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold font-sans tracking-wide text-slate-400 uppercase">
                          Competitors Selection
                        </h4>
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Driver 1 Selector */}
                        <div className="bg-[#070a13] p-2.5 rounded-xl border border-sky-500/20 flex flex-col gap-1">
                          <label className="text-[9px] font-bold font-sans tracking-wide text-sky-400 uppercase flex items-center gap-1">
                            <User size={8} />
                            Driver 1 (Primary)
                          </label>
                          <select
                            value={driver1Index !== null ? driver1Index : ''}
                            onChange={(e) => setDriver1Index(parseInt(e.target.value))}
                            className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500 font-sans"
                          >
                            {sessionData.drivers.map(d => (
                              <option key={d.index} value={d.index}>
                                [{getDriverAbbreviation(d.name)}] {d.name} {d.isHuman ? '(Human)' : '(AI)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Driver 2 Selector */}
                        <div className={`p-2.5 rounded-xl border flex flex-col gap-1 transition ${
                          driver2Index !== null 
                            ? 'bg-[#070a13] border-rose-500/20' 
                            : 'bg-[#0f172a]/30 border-dashed border-[#1e293b]'
                        }`}>
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold font-sans tracking-wide text-rose-400 uppercase flex items-center gap-1">
                              <User size={8} />
                              Driver 2 (Compare Overlay)
                            </label>
                            {driver2Index !== null && (
                              <button
                                onClick={() => setDriver2Index(null)}
                                className="text-[9px] text-slate-500 hover:text-slate-300 font-bold"
                              >
                                CLEAR
                              </button>
                            )}
                          </div>
                          <select
                            value={driver2Index !== null ? driver2Index : ''}
                            onChange={(e) => {
                              if (e.target.value === '') {
                                setDriver2Index(null);
                              } else {
                                setDriver2Index(parseInt(e.target.value));
                              }
                            }}
                            className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-rose-500 font-sans"
                          >
                            <option value="">-- No Comparison Driver --</option>
                            {sessionData.drivers
                              .filter(d => d.index !== driver1Index)
                              .map(d => (
                                <option key={d.index} value={d.index}>
                                  [{getDriverAbbreviation(d.name)}] {d.name} {d.isHuman ? '(Human)' : '(AI)'}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: Full-Width Telemetry Charts */}
                <div className="flex flex-col gap-6 w-full">
                  {/* Driver 1 Telemetry Chart */}
                  {driver1Info && driver1Telemetry ? (
                    <TelemetryChart
                      driverName={`#${driver1Info.index} ${driver1Info.name} ${driver1Info.isHuman ? '(HUMAN)' : '(AI)'}`}
                      telemetry={driver1Telemetry}
                      currentTime={currentTime}
                      onScrubTime={setCurrentTime}
                    />
                  ) : (
                    <div className="bg-[#0f172a]/45 border border-[#1e293b] rounded-2xl h-[280px] flex items-center justify-center text-xs text-slate-500 italic">
                      Select Driver 1 to visualize telemetry chart.
                    </div>
                  )}

                  {/* Driver 2 Telemetry Chart */}
                  {driver2Index !== null && driver2Info && driver2Telemetry ? (
                    <TelemetryChart
                      driverName={`#${driver2Info.index} ${driver2Info.name} ${driver2Info.isHuman ? '(HUMAN)' : '(AI)'}`}
                      telemetry={driver2Telemetry}
                      currentTime={currentTime}
                      onScrubTime={setCurrentTime}
                    />
                  ) : (
                    <div className="bg-[#0f172a]/20 border border-dashed border-[#1e293b] rounded-2xl h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center text-slate-500">
                        +
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                          No Comparison Competitor Selected
                        </h4>
                        <p className="text-[10px] text-slate-500 max-w-xs font-sans mt-0.5 leading-relaxed">
                          Choose a secondary driver in the dropdown or click a grey driver dot on the 2D map to plot their overlay telemetry below Driver 1.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}

export default App;

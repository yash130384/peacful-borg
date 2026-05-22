import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Award, 
  Zap, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  Gauge, 
  Activity, 
  Info,
  HelpCircle,
  TrendingUp,
  UserCheck,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import TrackMap, { getDriverAbbreviation } from './TrackMap';


const getTrackKey = (trackName) => {
  const name = trackName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
  if (name.includes('baku') || name.includes('azerbaijan')) return 'baku';
  if (name.includes('catalunya') || name.includes('barcelona') || name.includes('spain')) return 'catalunya';
  if (name.includes('losail') || name.includes('qatar') || name.includes('lusail')) return 'losail';
  if (name.includes('melbourne') || name.includes('australia') || name.includes('albertpark')) return 'melbourne';
  if (name.includes('shanghai') || name.includes('china')) return 'shanghai';
  if (name.includes('suzuka') || name.includes('japan')) return 'suzuka';
  if (name.includes('spielberg') || name.includes('austria') || name.includes('redbullring')) return 'spielberg';
  if (name.includes('silverstone') || name.includes('britain') || name.includes('england')) return 'silverstone';
  if (name.includes('monza') || name.includes('italy')) return 'monza';
  if (name.includes('spa') || name.includes('belgium')) return 'spa';
  if (name.includes('zandvoort') || name.includes('netherlands') || name.includes('dutch')) return 'zandvoort';
  if (name.includes('monaco')) return 'monaco';
  if (name.includes('budapest') || name.includes('hungary') || name.includes('hungaroring')) return 'budapest';
  if (name.includes('austin') || name.includes('cota') || name.includes('texas') || name.includes('america')) return 'austin';
  if (name.includes('mexico')) return 'mexicocity';
  if (name.includes('saopaulo') || name.includes('brazil') || name.includes('interlagos')) return 'saopaulo';
  if (name.includes('yasmarina') || name.includes('abudhabi')) return 'yasmarina';
  if (name.includes('jeddah') || name.includes('saudi')) return 'jeddah';
  if (name.includes('miami')) return 'miami';
  if (name.includes('imola') || name.includes('emilia')) return 'imola';
  if (name.includes('singapore') || name.includes('marinabay')) return 'singapore';
  if (name.includes('lasvegas')) return 'lasvegas';
  if (name.includes('sakhir') || name.includes('bahrain')) return 'sakhir';
  return name;
};

const F1_TRACK_INFO = {
  sakhir: {
    officialName: "Bahrain International Circuit (Sakhir)",
    turns: [
      { id: 1, name: "Kurve 1 (Michael Schumacher)", direction: "Rechtskurve", startPct: 0.03, endPct: 0.06 },
      { id: 2, name: "Kurve 2", direction: "Linkskurve", startPct: 0.06, endPct: 0.08 },
      { id: 3, name: "Kurve 3", direction: "Rechtskurve", startPct: 0.08, endPct: 0.10 },
      { id: 4, name: "Kurve 4", direction: "Rechtskurve", startPct: 0.16, endPct: 0.20 },
      { id: 5, name: "Kurve 5", direction: "Linkskurve", startPct: 0.23, endPct: 0.25 },
      { id: 6, name: "Kurve 6", direction: "Rechtskurve", startPct: 0.25, endPct: 0.27 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.27, endPct: 0.30 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.33, endPct: 0.36 },
      { id: 9, name: "Kurve 9", direction: "Linkskurve", startPct: 0.41, endPct: 0.44 },
      { id: 10, name: "Kurve 10", direction: "Linkskurve", startPct: 0.44, endPct: 0.47 },
      { id: 11, name: "Kurve 11", direction: "Linkskurve", startPct: 0.56, endPct: 0.59 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.62, endPct: 0.65 },
      { id: 13, name: "Kurve 13", direction: "Rechtskurve", startPct: 0.69, endPct: 0.72 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.83, endPct: 0.86 },
      { id: 15, name: "Kurve 15", direction: "Rechtskurve", startPct: 0.87, endPct: 0.90 }
    ]
  },
  jeddah: {
    officialName: "Jeddah Corniche Circuit",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Linkskurve", startPct: 0.03, endPct: 0.05 },
      { id: 2, name: "Kurve 2", direction: "Rechtskurve", startPct: 0.05, endPct: 0.07 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.12, endPct: 0.15 },
      { id: 10, name: "Kurve 10", direction: "Linkskurve", startPct: 0.28, endPct: 0.31 },
      { id: 13, name: "Kurve 13 (Steilkurve)", direction: "Linkskurve", startPct: 0.38, endPct: 0.42 },
      { id: 16, name: "Kurve 16", direction: "Linkskurve", startPct: 0.48, endPct: 0.51 },
      { id: 17, name: "Kurve 17", direction: "Rechtskurve", startPct: 0.51, endPct: 0.53 },
      { id: 22, name: "Kurve 22", direction: "Linkskurve", startPct: 0.67, endPct: 0.71 },
      { id: 27, name: "Kurve 27", direction: "Linkskurve", startPct: 0.91, endPct: 0.96 }
    ]
  },
  melbourne: {
    officialName: "Albert Park Circuit (Melbourne)",
    turns: [
      { id: 1, name: "Kurve 1 (Brabham)", direction: "Rechtskurve", startPct: 0.03, endPct: 0.06 },
      { id: 2, name: "Kurve 2 (Jones)", direction: "Linkskurve", startPct: 0.06, endPct: 0.09 },
      { id: 3, name: "Kurve 3", direction: "Rechtskurve", startPct: 0.13, endPct: 0.16 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.16, endPct: 0.19 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.21, endPct: 0.24 },
      { id: 6, name: "Kurve 6", direction: "Rechtskurve", startPct: 0.31, endPct: 0.34 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.34, endPct: 0.38 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.38, endPct: 0.42 },
      { id: 9, name: "Kurve 9", direction: "Rechtskurve", startPct: 0.53, endPct: 0.56 },
      { id: 10, name: "Kurve 10", direction: "Linkskurve", startPct: 0.56, endPct: 0.59 },
      { id: 11, name: "Kurve 11", direction: "Linkskurve", startPct: 0.68, endPct: 0.71 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.71, endPct: 0.74 },
      { id: 13, name: "Kurve 13 (Ascari)", direction: "Rechtskurve", startPct: 0.82, endPct: 0.85 },
      { id: 14, name: "Kurve 14", direction: "Linkskurve", startPct: 0.89, endPct: 0.94 }
    ]
  },
  shanghai: {
    officialName: "Shanghai International Circuit",
    turns: [
      { id: 1, name: "Kurve 1 (Schneckenkurve 1)", direction: "Rechtskurve", startPct: 0.03, endPct: 0.08 },
      { id: 2, name: "Kurve 2 (Schneckenkurve 2)", direction: "Rechtskurve", startPct: 0.08, endPct: 0.11 },
      { id: 3, name: "Kurve 3", direction: "Linkskurve", startPct: 0.11, endPct: 0.14 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.14, endPct: 0.17 },
      { id: 6, name: "Kurve 6 (Haarnadel)", direction: "Rechtskurve", startPct: 0.22, endPct: 0.25 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.32, endPct: 0.35 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.35, endPct: 0.38 },
      { id: 9, name: "Kurve 9", direction: "Linkskurve", startPct: 0.41, endPct: 0.44 },
      { id: 10, name: "Kurve 10", direction: "Rechtskurve", startPct: 0.44, endPct: 0.47 },
      { id: 11, name: "Kurve 11", direction: "Linkskurve", startPct: 0.58, endPct: 0.61 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.61, endPct: 0.64 },
      { id: 13, name: "Kurve 13 (Steilkurve)", direction: "Rechtskurve", startPct: 0.64, endPct: 0.68 },
      { id: 14, name: "Kurve 14 (Haarnadel)", direction: "Rechtskurve", startPct: 0.82, endPct: 0.86 },
      { id: 16, name: "Kurve 16", direction: "Linkskurve", startPct: 0.93, endPct: 0.97 }
    ]
  },
  miami: {
    officialName: "Miami International Autodrome",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Rechtskurve", startPct: 0.04, endPct: 0.07 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.12, endPct: 0.14 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.14, endPct: 0.16 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.20, endPct: 0.23 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.23, endPct: 0.25 },
      { id: 11, name: "Kurve 11 (Haarnadel)", direction: "Linkskurve", startPct: 0.38, endPct: 0.42 },
      { id: 14, name: "Kurve 14", direction: "Linkskurve", startPct: 0.58, endPct: 0.61 },
      { id: 15, name: "Kurve 15", direction: "Rechtskurve", startPct: 0.61, endPct: 0.63 },
      { id: 16, name: "Kurve 16", direction: "Linkskurve", startPct: 0.63, endPct: 0.65 },
      { id: 17, name: "Kurve 17 (Haarnadel)", direction: "Linkskurve", startPct: 0.82, endPct: 0.86 },
      { id: 19, name: "Kurve 19", direction: "Linkskurve", startPct: 0.93, endPct: 0.96 }
    ]
  },
  imola: {
    officialName: "Autodromo Enzo e Dino Ferrari (Imola)",
    turns: [
      { id: 2, name: "Kurve 2 (Tamburello)", direction: "Linkskurve", startPct: 0.08, endPct: 0.10 },
      { id: 3, name: "Kurve 3 (Tamburello Exit)", direction: "Rechtskurve", startPct: 0.10, endPct: 0.12 },
      { id: 5, name: "Kurve 5 (Villeneuve Entry)", direction: "Linkskurve", startPct: 0.22, endPct: 0.24 },
      { id: 6, name: "Kurve 6 (Villeneuve Exit)", direction: "Rechtskurve", startPct: 0.24, endPct: 0.26 },
      { id: 7, name: "Kurve 7 (Tosa)", direction: "Linkskurve", startPct: 0.29, endPct: 0.33 },
      { id: 9, name: "Kurve 9 (Piratella)", direction: "Linkskurve", startPct: 0.42, endPct: 0.46 },
      { id: 11, name: "Kurve 11 (Acque Minerali 1)", direction: "Rechtskurve", startPct: 0.51, endPct: 0.53 },
      { id: 12, name: "Kurve 12 (Acque Minerali 2)", direction: "Rechtskurve", startPct: 0.53, endPct: 0.56 },
      { id: 14, name: "Kurve 14 (Variante Alta 1)", direction: "Linkskurve", startPct: 0.70, endPct: 0.72 },
      { id: 15, name: "Kurve 15 (Variante Alta 2)", direction: "Rechtskurve", startPct: 0.72, endPct: 0.74 },
      { id: 17, name: "Kurve 17 (Rivazza 1)", direction: "Linkskurve", startPct: 0.86, endPct: 0.89 },
      { id: 18, name: "Kurve 18 (Rivazza 2)", direction: "Linkskurve", startPct: 0.89, endPct: 0.92 }
    ]
  },
  monaco: {
    officialName: "Circuit de Monaco",
    turns: [
      { id: 1, name: "Kurve 1 (Sainte Devote)", direction: "Rechtskurve", startPct: 0.05, endPct: 0.08 },
      { id: 3, name: "Kurve 3 (Massenet)", direction: "Linkskurve", startPct: 0.18, endPct: 0.21 },
      { id: 4, name: "Kurve 4 (Casino)", direction: "Rechtskurve", startPct: 0.22, endPct: 0.25 },
      { id: 5, name: "Kurve 5 (Mirabeau Haute)", direction: "Rechtskurve", startPct: 0.28, endPct: 0.31 },
      { id: 6, name: "Kurve 6 (Grand Hotel Hairpin)", direction: "Linkskurve", startPct: 0.32, endPct: 0.35 },
      { id: 7, name: "Kurve 7 (Mirabeau Bas)", direction: "Rechtskurve", startPct: 0.36, endPct: 0.39 },
      { id: 8, name: "Kurve 8 (Portier)", direction: "Rechtskurve", startPct: 0.40, endPct: 0.43 },
      { id: 10, name: "Kurve 10 (Nouvelle Chicane Entry)", direction: "Linkskurve", startPct: 0.51, endPct: 0.53 },
      { id: 11, name: "Kurve 11 (Nouvelle Chicane Exit)", direction: "Rechtskurve", startPct: 0.53, endPct: 0.55 },
      { id: 12, name: "Kurve 12 (Tabac)", direction: "Linkskurve", startPct: 0.60, endPct: 0.63 },
      { id: 13, name: "Kurve 13 (Piscine Entry)", direction: "Linkskurve", startPct: 0.66, endPct: 0.68 },
      { id: 14, name: "Kurve 14 (Piscine Exit)", direction: "Rechtskurve", startPct: 0.68, endPct: 0.70 },
      { id: 15, name: "Kurve 15 (Piscine Chicane Entry)", direction: "Linkskurve", startPct: 0.72, endPct: 0.74 },
      { id: 16, name: "Kurve 16 (Piscine Chicane Exit)", direction: "Rechtskurve", startPct: 0.74, endPct: 0.76 },
      { id: 18, name: "Kurve 18 (Rascasse)", direction: "Rechtskurve", startPct: 0.84, endPct: 0.88 },
      { id: 19, name: "Kurve 19 (Anthony Noghes)", direction: "Rechtskurve", startPct: 0.90, endPct: 0.94 }
    ]
  },
  catalunya: {
    officialName: "Circuit de Barcelona-Catalunya",
    turns: [
      { id: 1, name: "Kurve 1 (Elf)", direction: "Rechtskurve", startPct: 0.08, endPct: 0.11 },
      { id: 2, name: "Kurve 2", direction: "Linkskurve", startPct: 0.11, endPct: 0.13 },
      { id: 3, name: "Kurve 3 (Renault)", direction: "Rechtskurve", startPct: 0.15, endPct: 0.20 },
      { id: 4, name: "Kurve 4 (Repsol)", direction: "Rechtskurve", startPct: 0.26, endPct: 0.30 },
      { id: 5, name: "Kurve 5", direction: "Linkskurve", startPct: 0.32, endPct: 0.36 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.45, endPct: 0.47 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.47, endPct: 0.49 },
      { id: 9, name: "Kurve 9 (Campsa)", direction: "Rechtskurve", startPct: 0.56, endPct: 0.60 },
      { id: 10, name: "Kurve 10 (La Caixa)", direction: "Linkskurve", startPct: 0.69, endPct: 0.73 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.81, endPct: 0.85 },
      { id: 13, name: "Kurve 13", direction: "Rechtskurve", startPct: 0.86, endPct: 0.90 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.92, endPct: 0.96 }
    ]
  },
  montreal: {
    officialName: "Circuit Gilles Villeneuve (Montreal)",
    turns: [
      { id: 1, name: "Kurve 1 (Senna 'S')", direction: "Linkskurve", startPct: 0.05, endPct: 0.08 },
      { id: 2, name: "Kurve 2 (Senna 'S' Exit)", direction: "Rechtskurve", startPct: 0.08, endPct: 0.10 },
      { id: 3, name: "Kurve 3", direction: "Rechtskurve", startPct: 0.13, endPct: 0.15 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.15, endPct: 0.17 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.18, endPct: 0.21 },
      { id: 6, name: "Kurve 6", direction: "Linkskurve", startPct: 0.26, endPct: 0.28 },
      { id: 7, name: "Kurve 7", direction: "Rechtskurve", startPct: 0.28, endPct: 0.30 },
      { id: 8, name: "Kurve 8 (Chicane)", direction: "Rechtskurve", startPct: 0.40, endPct: 0.42 },
      { id: 9, name: "Kurve 9 (Chicane Exit)", direction: "Linkskurve", startPct: 0.42, endPct: 0.44 },
      { id: 10, name: "Kurve 10 (L'Epingle/Hairpin)", direction: "Rechtskurve", startPct: 0.56, endPct: 0.60 },
      { id: 13, name: "Kurve 13 (Wall of Champions)", direction: "Rechtskurve", startPct: 0.88, endPct: 0.91 },
      { id: 14, name: "Kurve 14 (Wall of Champions Exit)", direction: "Linkskurve", startPct: 0.91, endPct: 0.93 }
    ]
  },
  spielberg: {
    officialName: "Red Bull Ring (Spielberg)",
    turns: [
      { id: 1, name: "Kurve 1 (Niki Lauda)", direction: "Rechtskurve", startPct: 0.05, endPct: 0.08 },
      { id: 3, name: "Kurve 3 (Remus)", direction: "Rechtskurve", startPct: 0.22, endPct: 0.26 },
      { id: 4, name: "Kurve 4 (Schlossgold)", direction: "Rechtskurve", startPct: 0.38, endPct: 0.42 },
      { id: 5, name: "Kurve 5", direction: "Linkskurve", startPct: 0.50, endPct: 0.53 },
      { id: 6, name: "Kurve 6", direction: "Linkskurve", startPct: 0.53, endPct: 0.56 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.64, endPct: 0.67 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.67, endPct: 0.70 },
      { id: 9, name: "Kurve 9 (Jochen Rindt)", direction: "Rechtskurve", startPct: 0.84, endPct: 0.88 },
      { id: 10, name: "Kurve 10", direction: "Rechtskurve", startPct: 0.91, endPct: 0.95 }
    ]
  },
  silverstone: {
    officialName: "Silverstone Circuit",
    turns: [
      { id: 1, name: "Kurve 1 (Abbey)", direction: "Rechtskurve", startPct: 0.03, endPct: 0.06 },
      { id: 2, name: "Kurve 2 (Farm)", direction: "Linkskurve", startPct: 0.06, endPct: 0.09 },
      { id: 3, name: "Kurve 3 (Village)", direction: "Rechtskurve", startPct: 0.11, endPct: 0.14 },
      { id: 4, name: "Kurve 4 (The Loop)", direction: "Linkskurve", startPct: 0.14, endPct: 0.17 },
      { id: 6, name: "Kurve 6 (Brooklands)", direction: "Linkskurve", startPct: 0.23, endPct: 0.27 },
      { id: 7, name: "Kurve 7 (Luffield)", direction: "Rechtskurve", startPct: 0.27, endPct: 0.32 },
      { id: 8, name: "Kurve 8 (Woodcote)", direction: "Rechtskurve", startPct: 0.32, endPct: 0.36 },
      { id: 9, name: "Kurve 9 (Copse)", direction: "Rechtskurve", startPct: 0.42, endPct: 0.46 },
      { id: 10, name: "Kurve 10 (Maggots)", direction: "Linkskurve", startPct: 0.53, endPct: 0.56 },
      { id: 11, name: "Kurve 11 (Becketts Entry)", direction: "Rechtskurve", startPct: 0.56, endPct: 0.58 },
      { id: 12, name: "Kurve 12 (Becketts)", direction: "Linkskurve", startPct: 0.58, endPct: 0.60 },
      { id: 13, name: "Kurve 13 (Chapel)", direction: "Rechtskurve", startPct: 0.60, endPct: 0.63 },
      { id: 15, name: "Kurve 15 (Stowe)", direction: "Rechtskurve", startPct: 0.70, endPct: 0.74 },
      { id: 16, name: "Kurve 16 (Vale)", direction: "Linkskurve", startPct: 0.86, endPct: 0.89 },
      { id: 17, name: "Kurve 17 (Club Entry)", direction: "Rechtskurve", startPct: 0.89, endPct: 0.91 },
      { id: 18, name: "Kurve 18 (Club Exit)", direction: "Rechtskurve", startPct: 0.91, endPct: 0.93 }
    ]
  },
  budapest: {
    officialName: "Hungaroring (Budapest)",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Rechtskurve", startPct: 0.07, endPct: 0.10 },
      { id: 2, name: "Kurve 2", direction: "Linkskurve", startPct: 0.16, endPct: 0.20 },
      { id: 3, name: "Kurve 3", direction: "Rechtskurve", startPct: 0.20, endPct: 0.23 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.29, endPct: 0.33 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.36, endPct: 0.40 },
      { id: 6, name: "Kurve 6 (Schikane Entry)", direction: "Rechtskurve", startPct: 0.46, endPct: 0.48 },
      { id: 7, name: "Kurve 7 (Schikane Exit)", direction: "Linkskurve", startPct: 0.48, endPct: 0.50 },
      { id: 8, name: "Kurve 8", direction: "Linkskurve", startPct: 0.56, endPct: 0.59 },
      { id: 9, name: "Kurve 9", direction: "Rechtskurve", startPct: 0.59, endPct: 0.62 },
      { id: 11, name: "Kurve 11", direction: "Rechtskurve", startPct: 0.66, endPct: 0.70 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.76, endPct: 0.80 },
      { id: 13, name: "Kurve 13", direction: "Linkskurve", startPct: 0.83, endPct: 0.87 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.91, endPct: 0.96 }
    ]
  },
  spa: {
    officialName: "Circuit de Spa-Francorchamps",
    turns: [
      { id: 1, name: "Kurve 1 (La Source)", direction: "Rechtskurve", startPct: 0.04, endPct: 0.07 },
      { id: 2, name: "Kurve 2 (Eau Rouge)", direction: "Linkskurve", startPct: 0.12, endPct: 0.14 },
      { id: 3, name: "Kurve 3 (Raidillon Entry)", direction: "Rechtskurve", startPct: 0.14, endPct: 0.15 },
      { id: 4, name: "Kurve 4 (Raidillon Exit)", direction: "Linkskurve", startPct: 0.15, endPct: 0.17 },
      { id: 5, name: "Kurve 5 (Les Combes 1)", direction: "Rechtskurve", startPct: 0.26, endPct: 0.28 },
      { id: 6, name: "Kurve 6 (Les Combes 2)", direction: "Linkskurve", startPct: 0.28, endPct: 0.30 },
      { id: 7, name: "Kurve 7 (Malmedy)", direction: "Rechtskurve", startPct: 0.30, endPct: 0.32 },
      { id: 8, name: "Kurve 8 (Bruxelles)", direction: "Rechtskurve", startPct: 0.34, endPct: 0.38 },
      { id: 9, name: "Kurve 9 (Speaker's Corner)", direction: "Linkskurve", startPct: 0.38, endPct: 0.42 },
      { id: 10, name: "Kurve 10 (Pouhon 1)", direction: "Linkskurve", startPct: 0.46, endPct: 0.49 },
      { id: 11, name: "Kurve 11 (Pouhon 2)", direction: "Linkskurve", startPct: 0.49, endPct: 0.51 },
      { id: 12, name: "Kurve 12 (Fagnes 1)", direction: "Rechtskurve", startPct: 0.56, endPct: 0.58 },
      { id: 13, name: "Kurve 13 (Fagnes 2)", direction: "Linkskurve", startPct: 0.58, endPct: 0.60 },
      { id: 14, name: "Kurve 14 (Stavelot 1)", direction: "Rechtskurve", startPct: 0.64, endPct: 0.67 },
      { id: 15, name: "Kurve 15 (Stavelot 2)", direction: "Rechtskurve", startPct: 0.67, endPct: 0.69 },
      { id: 16, name: "Kurve 16 (Courbe Paul Frère)", direction: "Rechtskurve", startPct: 0.70, endPct: 0.74 },
      { id: 18, name: "Kurve 18 (Bus Stop Chicane 1)", direction: "Rechtskurve", startPct: 0.90, endPct: 0.92 },
      { id: 19, name: "Kurve 19 (Bus Stop Chicane 2)", direction: "Linkskurve", startPct: 0.92, endPct: 0.94 }
    ]
  },
  zandvoort: {
    officialName: "Circuit Zandvoort",
    turns: [
      { id: 1, name: "Kurve 1 (Tarzanbocht)", direction: "Rechtskurve", startPct: 0.05, endPct: 0.08 },
      { id: 2, name: "Kurve 2 (Gerlachbocht)", direction: "Rechtskurve", startPct: 0.09, endPct: 0.12 },
      { id: 3, name: "Kurve 3 (Hugenholtzbocht)", direction: "Linkskurve", startPct: 0.12, endPct: 0.16 },
      { id: 7, name: "Kurve 7 (Scheivlak)", direction: "Rechtskurve", startPct: 0.33, endPct: 0.37 },
      { id: 8, name: "Kurve 8 (Mastersbocht)", direction: "Rechtskurve", startPct: 0.39, endPct: 0.43 },
      { id: 9, name: "Kurve 9 (Bocht 9)", direction: "Linkskurve", startPct: 0.47, endPct: 0.51 },
      { id: 10, name: "Kurve 10 (Reenbocht)", direction: "Linkskurve", startPct: 0.52, endPct: 0.56 },
      { id: 11, name: "Kurve 11 (Hans Ernst Bocht 1)", direction: "Rechtskurve", startPct: 0.72, endPct: 0.75 },
      { id: 12, name: "Kurve 12 (Hans Ernst Bocht 2)", direction: "Linkskurve", startPct: 0.75, endPct: 0.77 },
      { id: 13, name: "Kurve 13 (Arie Luyendykbocht Entry)", direction: "Rechtskurve", startPct: 0.88, endPct: 0.91 },
      { id: 14, name: "Kurve 14 (Arie Luyendykbocht)", direction: "Rechtskurve", startPct: 0.91, endPct: 0.94 }
    ]
  },
  monza: {
    officialName: "Autodromo Nazionale Monza",
    turns: [
      { id: 1, name: "Kurve 1 (Variante del Rettifilo 1)", direction: "Rechtskurve", startPct: 0.16, endPct: 0.19 },
      { id: 2, name: "Kurve 2 (Variante del Rettifilo 2)", direction: "Linkskurve", startPct: 0.19, endPct: 0.22 },
      { id: 4, name: "Kurve 4 (Variante della Roggia 1)", direction: "Linkskurve", startPct: 0.32, endPct: 0.34 },
      { id: 5, name: "Kurve 5 (Variante della Roggia 2)", direction: "Rechtskurve", startPct: 0.34, endPct: 0.36 },
      { id: 6, name: "Kurve 6 (Curva di Lesmo 1)", direction: "Rechtskurve", startPct: 0.42, endPct: 0.44 },
      { id: 7, name: "Kurve 7 (Curva di Lesmo 2)", direction: "Rechtskurve", startPct: 0.44, endPct: 0.46 },
      { id: 8, name: "Kurve 8 (Variante Ascari 1)", direction: "Linkskurve", startPct: 0.72, endPct: 0.74 },
      { id: 9, name: "Kurve 9 (Variante Ascari 2)", direction: "Rechtskurve", startPct: 0.74, endPct: 0.76 },
      { id: 10, name: "Kurve 10 (Variante Ascari 3)", direction: "Linkskurve", startPct: 0.76, endPct: 0.78 },
      { id: 11, name: "Kurve 11 (Curva Alboreto / Parabolica)", direction: "Rechtskurve", startPct: 0.86, endPct: 0.92 }
    ]
  },
  singapore: {
    officialName: "Marina Bay Street Circuit (Singapore)",
    turns: [
      { id: 1, name: "Kurve 1 (Sheares)", direction: "Linkskurve", startPct: 0.05, endPct: 0.07 },
      { id: 2, name: "Kurve 2", direction: "Rechtskurve", startPct: 0.07, endPct: 0.09 },
      { id: 3, name: "Kurve 3", direction: "Linkskurve", startPct: 0.09, endPct: 0.11 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.12, endPct: 0.15 },
      { id: 7, name: "Kurve 7 (Memorial)", direction: "Linkskurve", startPct: 0.23, endPct: 0.27 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.27, endPct: 0.30 },
      { id: 9, name: "Kurve 9", direction: "Linkskurve", startPct: 0.32, endPct: 0.36 },
      { id: 10, name: "Kurve 10 (Sling)", direction: "Rechtskurve", startPct: 0.42, endPct: 0.46 },
      { id: 13, name: "Kurve 13 (Esplanade)", direction: "Linkskurve", startPct: 0.54, endPct: 0.58 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.62, endPct: 0.66 },
      { id: 16, name: "Kurve 16", direction: "Linkskurve", startPct: 0.80, endPct: 0.82 },
      { id: 17, name: "Kurve 17", direction: "Rechtskurve", startPct: 0.82, endPct: 0.84 },
      { id: 19, name: "Kurve 19", direction: "Linkskurve", startPct: 0.88, endPct: 0.92 }
    ]
  },
  austin: {
    officialName: "Circuit of the Americas (Austin)",
    turns: [
      { id: 1, name: "Kurve 1 (Big Red)", direction: "Linkskurve", startPct: 0.05, endPct: 0.08 },
      { id: 3, name: "Kurve 3 (S-Kurven)", direction: "Rechtskurve", startPct: 0.14, endPct: 0.16 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.16, endPct: 0.18 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.18, endPct: 0.20 },
      { id: 11, name: "Kurve 11 (Haarnadel)", direction: "Linkskurve", startPct: 0.36, endPct: 0.40 },
      { id: 12, name: "Kurve 12", direction: "Linkskurve", startPct: 0.54, endPct: 0.58 },
      { id: 13, name: "Kurve 13 (Stadion Entry)", direction: "Rechtskurve", startPct: 0.64, endPct: 0.66 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.66, endPct: 0.68 },
      { id: 15, name: "Kurve 15", direction: "Linkskurve", startPct: 0.68, endPct: 0.70 },
      { id: 16, name: "Kurve 16 (Triple-Apex 1)", direction: "Rechtskurve", startPct: 0.76, endPct: 0.78 },
      { id: 17, name: "Kurve 17 (Triple-Apex 2)", direction: "Rechtskurve", startPct: 0.78, endPct: 0.80 },
      { id: 18, name: "Kurve 18 (Triple-Apex 3)", direction: "Rechtskurve", startPct: 0.80, endPct: 0.82 },
      { id: 19, name: "Kurve 19", direction: "Linkskurve", startPct: 0.90, endPct: 0.92 },
      { id: 20, name: "Kurve 20", direction: "Rechtskurve", startPct: 0.92, endPct: 0.94 }
    ]
  },
  mexicocity: {
    officialName: "Autódromo Hermanos Rodríguez (Mexico City)",
    turns: [
      { id: 1, name: "Kurve 1 (Moisés Solana 1)", direction: "Rechtskurve", startPct: 0.10, endPct: 0.12 },
      { id: 2, name: "Kurve 2 (Moisés Solana 2)", direction: "Linkskurve", startPct: 0.12, endPct: 0.13 },
      { id: 3, name: "Kurve 3 (Moisés Solana 3)", direction: "Rechtskurve", startPct: 0.13, endPct: 0.15 },
      { id: 4, name: "Kurve 4", direction: "Linkskurve", startPct: 0.23, endPct: 0.25 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.25, endPct: 0.26 },
      { id: 6, name: "Kurve 6", direction: "Rechtskurve", startPct: 0.26, endPct: 0.28 },
      { id: 10, name: "Kurve 10 (S-Kurven 1)", direction: "Rechtskurve", startPct: 0.48, endPct: 0.50 },
      { id: 11, name: "Kurve 11 (S-Kurven 2)", direction: "Linkskurve", startPct: 0.50, endPct: 0.52 },
      { id: 12, name: "Kurve 12 (S-Kurven 3)", direction: "Rechtskurve", startPct: 0.52, endPct: 0.54 },
      { id: 13, name: "Kurve 13 (Foro Sol Entry)", direction: "Linkskurve", startPct: 0.80, endPct: 0.82 },
      { id: 14, name: "Kurve 14 (Foro Sol)", direction: "Linkskurve", startPct: 0.82, endPct: 0.84 },
      { id: 15, name: "Kurve 15 (Foro Sol Exit)", direction: "Rechtskurve", startPct: 0.84, endPct: 0.86 },
      { id: 17, name: "Kurve 17 (Nigel Mansell)", direction: "Rechtskurve", startPct: 0.90, endPct: 0.94 }
    ]
  },
  saopaulo: {
    officialName: "Autódromo José Carlos Pace (Interlagos, Sao Paulo)",
    turns: [
      { id: 1, name: "Kurve 1 (S do Senna 1)", direction: "Linkskurve", startPct: 0.07, endPct: 0.09 },
      { id: 2, name: "Kurve 2 (S do Senna 2)", direction: "Rechtskurve", startPct: 0.09, endPct: 0.11 },
      { id: 3, name: "Kurve 3 (Curva do Sol)", direction: "Linkskurve", startPct: 0.11, endPct: 0.15 },
      { id: 4, name: "Kurve 4 (Descida do Lago 1)", direction: "Linkskurve", startPct: 0.22, endPct: 0.24 },
      { id: 5, name: "Kurve 5 (Descida do Lago 2)", direction: "Rechtskurve", startPct: 0.24, endPct: 0.26 },
      { id: 8, name: "Kurve 8 (Ferradura)", direction: "Rechtskurve", startPct: 0.48, endPct: 0.50 },
      { id: 9, name: "Kurve 9 (Pinheirinho)", direction: "Linkskurve", startPct: 0.50, endPct: 0.53 },
      { id: 10, name: "Kurve 10 (Bico de Pato)", direction: "Rechtskurve", startPct: 0.56, endPct: 0.60 },
      { id: 12, name: "Kurve 12 (Junção)", direction: "Linkskurve", startPct: 0.72, endPct: 0.76 }
    ]
  },
  lasvegas: {
    officialName: "Las Vegas Strip Circuit",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Linkskurve", startPct: 0.04, endPct: 0.06 },
      { id: 2, name: "Kurve 2", direction: "Rechtskurve", startPct: 0.06, endPct: 0.08 },
      { id: 3, name: "Kurve 3", direction: "Linkskurve", startPct: 0.08, endPct: 0.09 },
      { id: 4, name: "Kurve 4", direction: "Rechtskurve", startPct: 0.09, endPct: 0.11 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.12, endPct: 0.15 },
      { id: 7, name: "Kurve 7", direction: "Linkskurve", startPct: 0.20, endPct: 0.22 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.22, endPct: 0.24 },
      { id: 9, name: "Kurve 9", direction: "Linkskurve", startPct: 0.24, endPct: 0.26 },
      { id: 12, name: "Kurve 12", direction: "Linkskurve", startPct: 0.52, endPct: 0.56 },
      { id: 14, name: "Kurve 14 (Haarnadel)", direction: "Linkskurve", startPct: 0.78, endPct: 0.82 },
      { id: 17, name: "Kurve 17", direction: "Linkskurve", startPct: 0.92, endPct: 0.96 }
    ]
  },
  losail: {
    officialName: "Lusail International Circuit (Qatar)",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Rechtskurve", startPct: 0.06, endPct: 0.11 },
      { id: 2, name: "Kurve 2", direction: "Linkskurve", startPct: 0.13, endPct: 0.17 },
      { id: 3, name: "Kurve 3", direction: "Rechtskurve", startPct: 0.18, endPct: 0.22 },
      { id: 4, name: "Kurve 4", direction: "Rechtskurve", startPct: 0.23, endPct: 0.27 },
      { id: 5, name: "Kurve 5", direction: "Rechtskurve", startPct: 0.28, endPct: 0.32 },
      { id: 6, name: "Kurve 6", direction: "Linkskurve", startPct: 0.35, endPct: 0.40 },
      { id: 7, name: "Kurve 7", direction: "Rechtskurve", startPct: 0.43, endPct: 0.48 },
      { id: 8, name: "Kurve 8", direction: "Rechtskurve", startPct: 0.49, endPct: 0.53 },
      { id: 9, name: "Kurve 9", direction: "Rechtskurve", startPct: 0.54, endPct: 0.58 },
      { id: 10, name: "Kurve 10", direction: "Linkskurve", startPct: 0.60, endPct: 0.65 },
      { id: 11, name: "Kurve 11", direction: "Rechtskurve", startPct: 0.69, endPct: 0.74 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.77, endPct: 0.81 },
      { id: 13, name: "Kurve 13", direction: "Rechtskurve", startPct: 0.81, endPct: 0.84 },
      { id: 14, name: "Kurve 14", direction: "Rechtskurve", startPct: 0.84, endPct: 0.88 },
      { id: 15, name: "Kurve 15", direction: "Rechtskurve", startPct: 0.89, endPct: 0.93 },
      { id: 16, name: "Kurve 16", direction: "Rechtskurve", startPct: 0.94, endPct: 0.98 }
    ]
  },
  yasmarina: {
    officialName: "Yas Marina Circuit (Abu Dhabi)",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Linkskurve", startPct: 0.05, endPct: 0.08 },
      { id: 5, name: "Kurve 5 (Haarnadel)", direction: "Linkskurve", startPct: 0.22, endPct: 0.25 },
      { id: 6, name: "Kurve 6 (Schikane Entry)", direction: "Linkskurve", startPct: 0.27, endPct: 0.29 },
      { id: 7, name: "Kurve 7 (Schikane Exit)", direction: "Rechtskurve", startPct: 0.29, endPct: 0.31 },
      { id: 9, name: "Kurve 9 (Nordschleife)", direction: "Linkskurve", startPct: 0.42, endPct: 0.46 },
      { id: 12, name: "Kurve 12 (Hotel Entry)", direction: "Rechtskurve", startPct: 0.70, endPct: 0.72 },
      { id: 13, name: "Kurve 13 (Hotel Underpass)", direction: "Linkskurve", startPct: 0.72, endPct: 0.74 },
      { id: 14, name: "Kurve 14 (Hotel Exit)", direction: "Linkskurve", startPct: 0.74, endPct: 0.76 },
      { id: 15, name: "Kurve 15 (Marina)", direction: "Rechtskurve", startPct: 0.82, endPct: 0.84 },
      { id: 16, name: "Kurve 16", direction: "Rechtskurve", startPct: 0.84, endPct: 0.86 }
    ]
  },
  suzuka: {
    officialName: "Suzuka International Racing Course",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Rechtskurve", startPct: 0.04, endPct: 0.08 },
      { id: 2, name: "Kurve 2", direction: "Rechtskurve", startPct: 0.08, endPct: 0.11 },
      { id: 3, name: "Kurve 3 (S-Kurve 1)", direction: "Linkskurve", startPct: 0.12, endPct: 0.15 },
      { id: 4, name: "Kurve 4 (S-Kurve 2)", direction: "Rechtskurve", startPct: 0.15, endPct: 0.18 },
      { id: 5, name: "Kurve 5 (S-Kurve 3)", direction: "Linkskurve", startPct: 0.18, endPct: 0.22 },
      { id: 6, name: "Kurve 6 (S-Kurve 4)", direction: "Rechtskurve", startPct: 0.22, endPct: 0.26 },
      { id: 7, name: "Kurve 7 (Dunlop)", direction: "Linkskurve", startPct: 0.26, endPct: 0.32 },
      { id: 8, name: "Kurve 8 (Degner 1)", direction: "Rechtskurve", startPct: 0.35, endPct: 0.38 },
      { id: 9, name: "Kurve 9 (Degner 2)", direction: "Rechtskurve", startPct: 0.38, endPct: 0.42 },
      { id: 10, name: "Kurve 10", direction: "Rechtskurve", startPct: 0.43, endPct: 0.47 },
      { id: 11, name: "Kurve 11 (Haarnadel)", direction: "Linkskurve", startPct: 0.47, endPct: 0.52 },
      { id: 12, name: "Kurve 12", direction: "Rechtskurve", startPct: 0.56, endPct: 0.60 },
      { id: 13, name: "Kurve 13 (Spoon Entry)", direction: "Linkskurve", startPct: 0.62, endPct: 0.66 },
      { id: 14, name: "Kurve 14 (Spoon Exit)", direction: "Linkskurve", startPct: 0.66, endPct: 0.72 },
      { id: 15, name: "Kurve 15 (130R)", direction: "Linkskurve", startPct: 0.83, endPct: 0.88 },
      { id: 16, name: "Kurve 16 (Schikane Entry)", direction: "Rechtskurve", startPct: 0.90, endPct: 0.93 },
      { id: 17, name: "Kurve 17 (Schikane Exit)", direction: "Linkskurve", startPct: 0.93, endPct: 0.95 },
      { id: 18, name: "Kurve 18", direction: "Rechtskurve", startPct: 0.95, endPct: 0.98 }
    ]
  },
  baku: {
    officialName: "Baku City Circuit",
    turns: [
      { id: 1, name: "Kurve 1", direction: "Linkskurve", startPct: 0.21, endPct: 0.24 },
      { id: 2, name: "Kurve 2", direction: "Linkskurve", startPct: 0.26, endPct: 0.29 },
      { id: 3, name: "Kurve 3", direction: "Linkskurve", startPct: 0.33, endPct: 0.36 },
      { id: 4, name: "Kurve 4", direction: "Rechtskurve", startPct: 0.37, endPct: 0.40 },
      { id: 5, name: "Kurve 5", direction: "Linkskurve", startPct: 0.41, endPct: 0.44 },
      { id: 6, name: "Kurve 6", direction: "Rechtskurve", startPct: 0.44, endPct: 0.46 },
      { id: 7, name: "Kurve 7", direction: "Rechtskurve", startPct: 0.50, endPct: 0.53 },
      { id: 8, name: "Kurve 8 (Schloss)", direction: "Linkskurve", startPct: 0.55, endPct: 0.58 },
      { id: 9, name: "Kurve 9", direction: "Rechtskurve", startPct: 0.58, endPct: 0.60 },
      { id: 10, name: "Kurve 10", direction: "Linkskurve", startPct: 0.60, endPct: 0.62 },
      { id: 11, name: "Kurve 11", direction: "Rechtskurve", startPct: 0.63, endPct: 0.66 },
      { id: 12, name: "Kurve 12", direction: "Linkskurve", startPct: 0.66, endPct: 0.69 },
      { id: 13, name: "Kurve 13", direction: "Linkskurve", startPct: 0.71, endPct: 0.74 },
      { id: 14, name: "Kurve 14", direction: "Linkskurve", startPct: 0.75, endPct: 0.78 },
      { id: 15, name: "Kurve 15", direction: "Linkskurve", startPct: 0.79, endPct: 0.83 },
      { id: 16, name: "Kurve 16", direction: "Linkskurve", startPct: 0.84, endPct: 0.88 },
      { id: 17, name: "Kurve 17", direction: "Rechtskurve", startPct: 0.89, endPct: 0.91 },
      { id: 18, name: "Kurve 18", direction: "Linkskurve", startPct: 0.92, endPct: 0.94 },
      { id: 19, name: "Kurve 19", direction: "Linkskurve", startPct: 0.95, endPct: 0.97 },
      { id: 20, name: "Kurve 20", direction: "Linkskurve", startPct: 0.97, endPct: 0.99 }
    ]
  }
};

// Format time into MM:SS.FFF
const formatLapTime = (timeInSecs) => {
  if (isNaN(timeInSecs) || !isFinite(timeInSecs) || timeInSecs <= 0) return '--:--.---';
  const mins = Math.floor(timeInSecs / 60);
  const secs = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// Resample a lap's telemetry points to uniform distance checkpoints
const resampleLapByDistance = (lapPoints, trackLength, numCheckpoints = 400) => {
  if (!lapPoints || lapPoints.length === 0) return [];
  
  // Sort points by lapDistance just in case
  const sortedPoints = [...lapPoints].sort((a, b) => a.lapDistance - b.lapDistance);
  
  const resampled = [];
  const step = trackLength / numCheckpoints;
  
  // Helper to interpolate at a target distance
  const getInterpolatedPoint = (targetDist) => {
    if (targetDist <= sortedPoints[0].lapDistance) return { ...sortedPoints[0], lapDistance: targetDist };
    if (targetDist >= sortedPoints[sortedPoints.length - 1].lapDistance) {
      return { ...sortedPoints[sortedPoints.length - 1], lapDistance: targetDist };
    }
    
    // Binary search
    let low = 0;
    let high = sortedPoints.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (sortedPoints[mid].lapDistance === targetDist) {
        return { ...sortedPoints[mid] };
      } else if (sortedPoints[mid].lapDistance < targetDist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    const p0 = sortedPoints[high];
    const p1 = sortedPoints[low];
    if (!p0) return p1;
    if (!p1) return p0;
    
    const ratio = (targetDist - p0.lapDistance) / (p1.lapDistance - p0.lapDistance);
    return {
      t: p0.t + (p1.t - p0.t) * ratio,
      x: p0.x + (p1.x - p0.x) * ratio,
      z: p0.z + (p1.z - p0.z) * ratio,
      speed: p0.speed + (p1.speed - p0.speed) * ratio,
      throttle: p0.throttle + (p1.throttle - p0.throttle) * ratio,
      brake: p0.brake + (p1.brake - p0.brake) * ratio,
      gear: Math.round(p0.gear + (p1.gear - p0.gear) * ratio),
      drs: p0.drs,
      ers: p0.ers + (p1.ers - p0.ers) * ratio,
      lapNum: p0.lapNum,
      lapDistance: targetDist
    };
  };
  
  for (let i = 0; i <= numCheckpoints; i++) {
    const targetDist = i * step;
    resampled.push(getInterpolatedPoint(targetDist));
  }
  
  return resampled;
};

// Helper to find elapsed time (in seconds) in a lap given a lap distance
const getElapsedAtDistance = (lap, distance) => {
  if (!lap || !lap.points || lap.points.length === 0) return 0;
  const points = lap.points;
  
  if (distance <= points[0].lapDistance) return 0;
  if (distance >= points[points.length - 1].lapDistance) return lap.duration;
  
  // Binary search on lapDistance
  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].lapDistance === distance) {
      return points[mid].t - lap.startSessionTime;
    } else if (points[mid].lapDistance < distance) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  const p0 = points[high];
  const p1 = points[low];
  if (!p0) return p1.t - lap.startSessionTime;
  if (!p1) return p0.t - lap.startSessionTime;
  
  const distRange = p1.lapDistance - p0.lapDistance;
  if (distRange === 0) return p0.t - lap.startSessionTime;
  
  const ratio = (distance - p0.lapDistance) / distRange;
  const t = p0.t + ratio * (p1.t - p0.t);
  return t - lap.startSessionTime;
};

// Helper to find lap distance given an elapsed time (in seconds) in a lap
const getDistanceAtElapsed = (lap, elapsed) => {
  if (!lap || !lap.points || lap.points.length === 0) return 0;
  const points = lap.points;
  const targetTime = lap.startSessionTime + elapsed;
  
  if (targetTime <= points[0].t) return points[0].lapDistance;
  if (targetTime >= points[points.length - 1].t) return points[points.length - 1].lapDistance;
  
  // Binary search on session time t
  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].t === targetTime) {
      return points[mid].lapDistance;
    } else if (points[mid].t < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  const p0 = points[high];
  const p1 = points[low];
  if (!p0) return p1.lapDistance;
  if (!p1) return p0.lapDistance;
  
  const timeRange = p1.t - p0.t;
  if (timeRange === 0) return p0.lapDistance;
  
  const ratio = (targetTime - p0.t) / timeRange;
  return p0.lapDistance + ratio * (p1.lapDistance - p0.lapDistance);
};

const DriverCoach = ({ 
  sessionData, 
  onBack 
}) => {
  const [selectedDriverIndex, setSelectedDriverIndex] = useState(null);
  const [selectedCompareLapNum, setSelectedCompareLapNum] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [chartCursorDistance, setChartCursorDistance] = useState(null);
  const [focusedZone, setFocusedZone] = useState(null);
  const [activeCornerId, setActiveCornerId] = useState(null);
  const [zoomToSelected, setZoomToSelected] = useState(true);
  const [showOnlyImprovements, setShowOnlyImprovements] = useState(false);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Lifted Map View & Line Toggles states
  const [showRaceline, setShowRaceline] = useState(true);
  const [showD1Trail, setShowD1Trail] = useState(true);
  const [showD2Trail, setShowD2Trail] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);
  const [followZoomEnvelope, setFollowZoomEnvelope] = useState(100); // default 100m

  const requestRef = useRef();
  const previousTimeRef = useRef();



  const handleCornerClick = (corner) => {
    if (activeCornerId === corner.id) {
      setActiveCornerId(null);
      setFocusedZone(null);
      setChartCursorDistance(null);
    } else {
      setActiveCornerId(corner.id);
      setFocusedZone({ startDistance: corner.startDistance, endDistance: corner.endDistance });
      setChartCursorDistance(corner.apexDistance);
    }
  };
  
  // Track length calculation based on max lapDistance observed in session
  const trackLength = useMemo(() => {
    if (!sessionData || !sessionData.telemetry) return 4000;
    let maxDist = 0;
    for (const driverPts of Object.values(sessionData.telemetry)) {
      for (let i = 0; i < Math.min(driverPts.length, 500); i++) {
        if (driverPts[i].lapDistance > maxDist) maxDist = driverPts[i].lapDistance;
      }
      // Check last few points as well
      const len = driverPts.length;
      for (let i = Math.max(0, len - 200); i < len; i++) {
        if (driverPts[i].lapDistance > maxDist) maxDist = driverPts[i].lapDistance;
      }
    }
    return maxDist || 4000;
  }, [sessionData]);

  // 1. Auto-select default driver on load
  useEffect(() => {
    if (sessionData && sessionData.drivers && sessionData.drivers.length > 0) {
      const human = sessionData.drivers.find(d => d.isHuman);
      if (human) {
        setSelectedDriverIndex(human.index);
      } else {
        setSelectedDriverIndex(sessionData.drivers[0].index);
      }
    }
  }, [sessionData]);



  // 2. Segment telemetry into laps for ALL drivers
  const driversLaps = useMemo(() => {
    if (!sessionData || !sessionData.telemetry) return {};
    
    const result = {};
    for (const [driverIdxStr, points] of Object.entries(sessionData.telemetry)) {
      const driverIdx = parseInt(driverIdxStr);
      if (points.length === 0) continue;
      
      const lapsMap = {};
      points.forEach(pt => {
        if (!lapsMap[pt.lapNum]) {
          lapsMap[pt.lapNum] = [];
        }
        lapsMap[pt.lapNum].push(pt);
      });
      
      const lapsList = [];
      Object.entries(lapsMap).forEach(([lapNumStr, lapPts]) => {
        const lapNum = parseInt(lapNumStr);
        if (lapPts.length < 15) return; // ignore noisy packets
        
        // Sort points by time
        lapPts.sort((a, b) => a.t - b.t);
        
        const minTime = lapPts[0].t;
        const maxTime = lapPts[lapPts.length - 1].t;
        const duration = maxTime - minTime;
        
        const minD = lapPts[0].lapDistance;
        const maxD = Math.max(...lapPts.map(p => p.lapDistance));
        const distDelta = maxD - minD;
        
        // A lap is complete if it covers at least 90% of the track length
        const isComplete = distDelta > 0.9 * trackLength;
        
        // Find max speed in this lap
        const maxSpeed = Math.max(...lapPts.map(p => p.speed));
        const avgSpeed = lapPts.reduce((sum, p) => sum + p.speed, 0) / lapPts.length;
        
        lapsList.push({
          lapNum,
          points: lapPts,
          duration,
          maxSpeed,
          avgSpeed: Math.round(avgSpeed),
          isComplete,
          startSessionTime: minTime
        });
      });
      
      // Sort laps by lap number
      lapsList.sort((a, b) => a.lapNum - b.lapNum);
      result[driverIdx] = lapsList;
    }
    return result;
  }, [sessionData, trackLength]);

  // 3. Find the ABSOLUTE fastest lap in the entire session (reference lap)
  const sessionBestLap = useMemo(() => {
    let bestLap = null;
    
    Object.entries(driversLaps).forEach(([driverIdxStr, laps]) => {
      const driverIdx = parseInt(driverIdxStr);
      const driverName = sessionData.drivers.find(d => d.index === driverIdx)?.name || `Fahrer ${driverIdx}`;
      
      laps.forEach(lap => {
        // Must be complete and have a realistic lap time (e.g. > 45s)
        if (lap.isComplete && lap.duration > 45) {
          if (!bestLap || lap.duration < bestLap.duration) {
            bestLap = {
              ...lap,
              driverIndex: driverIdx,
              driverName
            };
          }
        }
      });
    });
    
    return bestLap;
  }, [driversLaps, sessionData]);

  // Selected driver laps list
  const selectedDriverLaps = useMemo(() => {
    if (selectedDriverIndex === null) return [];
    return driversLaps[selectedDriverIndex] || [];
  }, [driversLaps, selectedDriverIndex]);

  // Selected driver best valid lap
  const selectedDriverBestLap = useMemo(() => {
    let best = null;
    selectedDriverLaps.forEach(lap => {
      if (lap.isComplete && lap.duration > 45) {
        if (!best || lap.duration < best.duration) {
          best = lap;
        }
      }
    });
    return best;
  }, [selectedDriverLaps]);

  // 4. Auto-select comparison lap (by default the selected driver's best lap)
  useEffect(() => {
    if (selectedDriverBestLap) {
      setSelectedCompareLapNum(selectedDriverBestLap.lapNum);
    } else if (selectedDriverLaps.length > 0) {
      // If no valid lap, select first lap
      setSelectedCompareLapNum(selectedDriverLaps[0].lapNum);
    } else {
      setSelectedCompareLapNum(null);
    }
  }, [selectedDriverBestLap, selectedDriverLaps]);

  // The active comparison lap object
  const activeCompareLap = useMemo(() => {
    if (selectedCompareLapNum === null) return null;
    return selectedDriverLaps.find(l => l.lapNum === selectedCompareLapNum) || null;
  }, [selectedDriverLaps, selectedCompareLapNum]);

  // The actual reference lap to compare against:
  // If the selected driver IS the session best driver, we compare their selected lap against their own best lap.
  // Otherwise, we compare their selected lap against the overall session best lap.
  const referenceLap = useMemo(() => {
    if (!sessionBestLap) return null;
    
    // If selected driver is the session best driver, and they want to compare their best lap,
    // they compare against their best lap (which matches, resulting in 0 delta).
    // Or if they select another lap, they compare against their best lap.
    if (selectedDriverIndex === sessionBestLap.driverIndex) {
      return selectedDriverBestLap;
    }
    
    return sessionBestLap;
  }, [sessionBestLap, selectedDriverIndex, selectedDriverBestLap]);

  const maxDuration = useMemo(() => {
    if (!activeCompareLap || !referenceLap) return 0;
    return Math.max(activeCompareLap.duration, referenceLap.duration);
  }, [activeCompareLap, referenceLap]);

  const d2Color = useMemo(() => {
    if (!referenceLap || !sessionData || !sessionData.drivers) return '#f43f5e'; // default rose
    const d2 = sessionData.drivers.find(d => d.index === referenceLap.driverIndex);
    if (!d2) return '#f43f5e';
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
    return TEAM_COLORS[d2.teamId] || '#f43f5e';
  }, [referenceLap, sessionData]);

  const d1Distance = useMemo(() => {
    if (!activeCompareLap) return null;
    const clampedTime = Math.min(playbackTime, activeCompareLap.duration);
    return getDistanceAtElapsed(activeCompareLap, clampedTime);
  }, [activeCompareLap, playbackTime]);

  const d2Distance = useMemo(() => {
    if (!referenceLap) return null;
    const clampedTime = Math.min(playbackTime, referenceLap.duration);
    return getDistanceAtElapsed(referenceLap, clampedTime);
  }, [referenceLap, playbackTime]);

  // Reset playback if the active comparison lap or selected driver changes
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    setChartCursorDistance(0);
    setFollowDriver(true);
  }, [selectedDriverIndex, selectedCompareLapNum]);

  // High-performance requestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    const animate = (time) => {
      if (previousTimeRef.current !== null && previousTimeRef.current !== undefined) {
        const deltaTime = (time - previousTimeRef.current) / 1000;
        
        setPlaybackTime((prevTime) => {
          let nextTime = prevTime + deltaTime * playbackSpeed;
          
          if (nextTime >= maxDuration) {
            nextTime = 0; // restart lap loop when slower driver completes it
            setFollowDriver(true); // Automatically re-enable follow mode on loop restart
          }
          
          // Automatically sync cursor position
          if (activeCompareLap) {
            const dist = getDistanceAtElapsed(activeCompareLap, nextTime);
            setChartCursorDistance(dist);
          }
          
          return nextTime;
        });
      }
      
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, activeCompareLap, maxDuration]);

  // 5. RESAMPLE AND COMPARE LAPS
  const resampledComparison = useMemo(() => {
    if (!activeCompareLap || !referenceLap) return null;
    
    // Resample both laps by distance
    const numSteps = 400;
    const refResampled = resampleLapByDistance(referenceLap.points, trackLength, numSteps);
    const selResampled = resampleLapByDistance(activeCompareLap.points, trackLength, numSteps);
    
    if (refResampled.length === 0 || selResampled.length === 0) return null;
    
    const alignedData = [];
    
    // Calculate reference time at d=0 and selected time at d=0
    const refStartTime = refResampled[0].t;
    const selStartTime = selResampled[0].t;
    
    for (let i = 0; i < refResampled.length; i++) {
      const refPt = refResampled[i];
      const selPt = selResampled[i];
      
      const refElapsed = refPt.t - refStartTime;
      const selElapsed = selPt.t - selStartTime;
      
      const deltaT = selElapsed - refElapsed;
      
      alignedData.push({
        lapDistance: refPt.lapDistance,
        x: selPt.x,
        z: selPt.z,
        deltaT,
        selSpeed: selPt.speed,
        refSpeed: refPt.speed,
        selThrottle: selPt.throttle,
        refThrottle: refPt.throttle,
        selBrake: selPt.brake,
        refBrake: refPt.brake,
        selGear: selPt.gear,
        refGear: refPt.gear
      });
    }
    
    // Compute moving average of time loss to color the track heatmap smoothly
    const heatmapPoints = alignedData.map((pt, idx) => {
      // Look back 4 points and forward 4 points to compute local rate of time loss (d(delta)/ds)
      const windowSize = 6;
      const startIdx = Math.max(0, idx - windowSize / 2);
      const endIdx = Math.min(alignedData.length - 1, idx + windowSize / 2);
      
      const dDelta = alignedData[endIdx].deltaT - alignedData[startIdx].deltaT;
      const dDist = alignedData[endIdx].lapDistance - alignedData[startIdx].lapDistance;
      
      // rate = seconds lost per meter
      const lossRatePerMeter = dDist > 0 ? dDelta / dDist : 0;
      
      // Let's scale it to: seconds lost per 50 meters
      const lossPer50m = lossRatePerMeter * 50;
      
      // Color gradient: Green (stable/gaining) -> Yellow -> Red (losing 0.06s+ per 50m)
      let color = '#10b981'; // green
      if (lossPer50m > 0) {
        const maxLoss = 0.04; // threshold for full red
        const ratio = Math.min(1, lossPer50m / maxLoss);
        // HSL Interpolation from 140 (Green) to 0 (Red)
        const hue = 140 - ratio * 140;
        color = `hsl(${hue}, 80%, 50%)`;
      }
      
      return {
        x: pt.x,
        z: pt.z,
        lapDistance: pt.lapDistance,
        color
      };
    });
    
    return {
      alignedData,
      heatmapPoints
    };
  }, [activeCompareLap, referenceLap, trackLength]);

  // Extract track coordinates from reference lap for geometric corner detection
  const trackPath = useMemo(() => {
    if (!referenceLap || !referenceLap.points) return [];
    return referenceLap.points.map(pt => ({
      x: pt.x,
      z: pt.z,
      lapDistance: pt.lapDistance
    }));
  }, [referenceLap]);

  // Curvature-based dynamic corner detector or database calendar tracks
  const trackCorners = useMemo(() => {
    if (!trackLength) return [];

    const trackKey = getTrackKey(sessionData?.trackName || '');
    const trackInfo = F1_TRACK_INFO[trackKey];

    if (trackInfo && trackInfo.turns && trackInfo.turns.length > 0) {
      return trackInfo.turns.map(turn => {
        const startPct = turn.startPct;
        const endPct = turn.endPct;
        let apexPct = (startPct + endPct) / 2;
        if (endPct < startPct) {
          apexPct = (startPct + endPct + 1) / 2;
          if (apexPct >= 1) apexPct -= 1;
        }
        let startDistance = startPct * trackLength;
        let endDistance = endPct * trackLength;
        let apexDistance = apexPct * trackLength;

        if (startDistance < 0) startDistance += trackLength;
        if (endDistance > trackLength) endDistance -= trackLength;
        if (apexDistance > trackLength) apexDistance -= trackLength;

        let length = endDistance - startDistance;
        if (length < 0) length += trackLength;

        return {
          id: turn.id,
          name: turn.name,
          startDistance,
          endDistance,
          apexDistance,
          direction: turn.direction,
          length
        };
      });
    }

    // FALLBACK: curvature-based dynamic corner detector
    if (trackPath.length < 20) return [];

    const pathLen = trackPath.length;
    const avgSpacing = trackLength / pathLen;
    // Window of about 60m to compute headings (k points behind, k points ahead)
    const k = Math.max(2, Math.round(30 / (avgSpacing || 1)));

    // 1. Calculate heading angles at each point
    const headings = [];
    for (let i = 0; i < pathLen; i++) {
      const prevIdx = (i - k + pathLen) % pathLen;
      const nextIdx = (i + k) % pathLen;
      headings.push(Math.atan2(trackPath[nextIdx].z - trackPath[prevIdx].z, trackPath[nextIdx].x - trackPath[prevIdx].x));
    }

    // 2. Calculate curvature (heading change)
    const curvatures = [];
    const windowDiff = Math.max(1, Math.round(k / 2));
    for (let i = 0; i < pathLen; i++) {
      const prevIdx = (i - windowDiff + pathLen) % pathLen;
      const nextIdx = (i + windowDiff) % pathLen;
      let diff = headings[nextIdx] - headings[prevIdx];
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      curvatures.push(diff);
    }

    // 3. Find turning points exceeding curvature threshold (approx. 0.08 rad)
    const turnThreshold = 0.08;
    const turningPoints = [];
    for (let i = 0; i < pathLen; i++) {
      const c = curvatures[i];
      if (Math.abs(c) > turnThreshold) {
        turningPoints.push({
          idx: i,
          lapDistance: trackPath[i].lapDistance,
          curv: c,
          sign: Math.sign(c)
        });
      }
    }

    if (turningPoints.length === 0) return [];

    // 4. Group contiguous points into turning segments
    const segments = [];
    let currentSegment = [turningPoints[0]];

    for (let i = 1; i < turningPoints.length; i++) {
      const pt = turningPoints[i];
      const prev = turningPoints[i - 1];
      let dDist = pt.lapDistance - prev.lapDistance;
      if (dDist < 0) dDist += trackLength; // wrap-around

      // Merge if same direction and within 60 meters
      if (pt.sign === prev.sign && dDist < 60) {
        currentSegment.push(pt);
      } else {
        segments.push(currentSegment);
        currentSegment = [pt];
      }
    }
    segments.push(currentSegment);

    // 5. Structure segments into sequential track corners
    const cornersList = [];
    let turnCounter = 1;

    segments.forEach(seg => {
      if (seg.length < 3) return;

      const startPt = seg[0];
      const endPt = seg[seg.length - 1];
      let segLen = endPt.lapDistance - startPt.lapDistance;
      if (segLen < 0) segLen += trackLength;

      // Filter out short bumps
      if (segLen < 25) return;

      // Apex: max curvature point
      let apexPt = seg[0];
      let maxCurvVal = 0;
      seg.forEach(pt => {
        if (Math.abs(pt.curv) > maxCurvVal) {
          maxCurvVal = Math.abs(pt.curv);
          apexPt = pt;
        }
      });

      // Pad corner: 30m entry (braking) & 20m exit
      let startDistance = startPt.lapDistance - 30;
      let endDistance = endPt.lapDistance + 20;

      if (startDistance < 0) startDistance += trackLength;
      if (endDistance > trackLength) endDistance -= trackLength;

      const direction = apexPt.curv > 0 ? 'Rechtskurve' : 'Linkskurve';
      const currentId = turnCounter++;

      cornersList.push({
        id: currentId,
        name: `Kurve ${currentId}`,
        startDistance,
        endDistance,
        apexDistance: apexPt.lapDistance,
        direction,
        length: segLen
      });
    });

    return cornersList;
  }, [trackPath, trackLength, sessionData]);

  // Turn-by-turn detailed performance evaluation
  const cornerEvaluations = useMemo(() => {
    if (!resampledComparison || trackCorners.length === 0) return [];
    
    const { alignedData } = resampledComparison;
    const evaluations = [];
    
    trackCorners.forEach(corner => {
      // Find aligned points in this corner
      let zonePoints = [];
      const { startDistance, endDistance } = corner;
      
      if (startDistance <= endDistance) {
        zonePoints = alignedData.filter(pt => pt.lapDistance >= startDistance && pt.lapDistance <= endDistance);
      } else {
        // Handles lap wrap-around
        zonePoints = alignedData.filter(pt => pt.lapDistance >= startDistance || pt.lapDistance <= endDistance);
      }
      
      if (zonePoints.length === 0) return;
      
      // Calculate corner delta: deltaT at end of corner minus deltaT at start of corner
      const firstPt = zonePoints[0];
      const lastPt = zonePoints[zonePoints.length - 1];
      const cornerDelta = lastPt.deltaT - firstPt.deltaT;
      
      // Speed comparison
      const refMinSpeed = Math.min(...zonePoints.map(p => p.refSpeed));
      const selMinSpeed = Math.min(...zonePoints.map(p => p.selSpeed));
      const speedDiffAtMin = refMinSpeed - selMinSpeed;
      
      // Brake/Throttle points
      const refBrakePt = zonePoints.find(p => p.refBrake > 0.1);
      const selBrakePt = zonePoints.find(p => p.selBrake > 0.1);
      
      let explanation = "";
      let advice = "";
      let category = "neutral";
      
      if (cornerDelta < -0.015) {
        category = "gain";
        explanation = `Hervorragende Kurvenfahrt! Du fährst hier extrem stark und nimmst der Referenz ${Math.abs(cornerDelta).toFixed(3)}s ab.`;
        advice = "Perfekt getroffen. Behalte diese Linie bei. Deine Kombination aus spätem Bremspunkt und früher Beschleunigung war optimal.";
      } else if (cornerDelta <= 0.015) {
        category = "neutral";
        explanation = `Konstante Leistung. Du verlierst oder gewinnst kaum Zeit im Vergleich zur Referenz (${cornerDelta > 0 ? '+' : ''}${cornerDelta.toFixed(3)}s).`;
        advice = "Versuche, die Kurve noch sauberer zu schneiden, um 2–3 km/h mehr Apex-Geschwindigkeit mitzunehmen und den Schwung zu maximieren.";
      } else {
        // Lost time diagnostic
        if (selBrakePt && refBrakePt && (selBrakePt.lapDistance - refBrakePt.lapDistance) < -6) {
          category = "braking";
          const distDiff = Math.round(refBrakePt.lapDistance - selBrakePt.lapDistance);
          explanation = `Du bremst hier ca. ${distDiff} Meter früher als die Referenz. Dadurch verlierst du beim Anbremsen viel Zeit.`;
          advice = "Bremse gezielt 5–10 Meter später. Nutze feste Orientierungspunkte an der Strecke (z.B. Curbs, Schilder) und lasse das Auto mit Restbremsdruck in die Kurve hineinrollen (Trail-Braking).";
        } else if (speedDiffAtMin > 5) {
          category = "apex";
          explanation = `Deine Mindestgeschwindigkeit im Scheitelpunkt (Apex) liegt um ${Math.round(speedDiffAtMin)} km/h unter der Referenz (${Math.round(selMinSpeed)} vs ${Math.round(refMinSpeed)} km/h).`;
          advice = "Löse die Bremse vor dem Scheitelpunkt progressiver. Dadurch entlastest du die Reifen von Längskräften und baust mehr Seitenführungskräfte für höhere Kurvengeschwindigkeit auf.";
        } else {
          const midIdx = Math.floor(zonePoints.length / 2);
          const exitPoints = zonePoints.slice(midIdx);
          const refGasPt = exitPoints.find(p => p.refThrottle > 0.6);
          const selGasPt = exitPoints.find(p => p.selThrottle > 0.6);
          
          if (refGasPt && selGasPt && (selGasPt.lapDistance - refGasPt.lapDistance) > 8) {
            category = "exit";
            const gasDistDiff = Math.round(selGasPt.lapDistance - refGasPt.lapDistance);
            explanation = `Am Kurvenausgang gehst du ca. ${gasDistDiff} Meter später auf Vollgas als der Referenzfahrer. Das kostet Höchstgeschwindigkeit auf der Geraden.`;
            advice = "Öffne die Lenkung am Scheitelpunkt früher (Vorderräder gerade stellen) und gehe entschlossener aufs Gaspedal, um den Schwung direkt auf die Gerade mitzunehmen.";
          } else {
            category = "line";
            explanation = `Du verlierst in dieser Kurve ${cornerDelta.toFixed(3)}s durch eine unruhigere Linie oder ungünstige Positionierung des Fahrzeugs.`;
            advice = "Vergleiche deine Fahrtlinie auf der Karte mit der Ideallinie. Fahre die Kurve etwas weiter an, um den Radius zu vergrößern und so mehr Traktion beim Rausbeschleunigen zu haben.";
          }
        }
      }
      
      evaluations.push({
        id: corner.id,
        name: corner.name,
        direction: corner.direction,
        startDistance: corner.startDistance,
        endDistance: corner.endDistance,
        apexDistance: corner.apexDistance,
        cornerDelta,
        refMinSpeed,
        selMinSpeed,
        category,
        explanation,
        advice
      });
    });
    
    return evaluations;
  }, [resampledComparison, trackCorners]);

  // Filter corners for only improvements (time loss > 0.015s)
  const filteredCornerEvaluations = useMemo(() => {
    if (showOnlyImprovements) {
      return cornerEvaluations.filter(evt => evt.cornerDelta > 0.015);
    }
    return cornerEvaluations;
  }, [cornerEvaluations, showOnlyImprovements]);

  // Zoom Range Calculation
  const zoomRange = useMemo(() => {
    if (!zoomToSelected || !focusedZone || !trackLength) return null;
    const start = focusedZone.startDistance;
    const end = focusedZone.endDistance;
    if (start <= end) {
      const padding = 40; // 40m padding
      return [
        Math.max(0, start - padding),
        Math.min(trackLength, end + padding)
      ];
    }
    return null;
  }, [zoomToSelected, focusedZone, trackLength]);

  // Total potential time saved across all corners with losses
  const totalPotentialTimeSaved = useMemo(() => {
    return cornerEvaluations.reduce((sum, e) => {
      if (e.cornerDelta > 0.015) {
        return sum + e.cornerDelta;
      }
      return sum;
    }, 0);
  }, [cornerEvaluations]);

  // 7. PREPARE CHART DATA
  const deltaChartData = useMemo(() => {
    if (!resampledComparison) return { datasets: [] };
    
    const { alignedData } = resampledComparison;
    const labels = alignedData.map(d => Math.round(d.lapDistance));
    
    return {
      labels,
      datasets: [
        {
          label: 'Delta-T (Zeitunterschied in Sek)',
          data: alignedData.map(d => d.deltaT),
          borderColor: '#eab308', // Yellow
          backgroundColor: 'rgba(234, 179, 8, 0.05)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    };
  }, [resampledComparison]);

  const telemetryChartData = useMemo(() => {
    if (!resampledComparison) return { datasets: [] };
    
    const { alignedData } = resampledComparison;
    const labels = alignedData.map(d => Math.round(d.lapDistance));
    
    const selectedDriverAbbr = sessionData.drivers.find(d => d.index === selectedDriverIndex)
      ? getDriverAbbreviation(sessionData.drivers.find(d => d.index === selectedDriverIndex).name)
      : 'FAH';
      
    const refDriverAbbr = referenceLap
      ? getDriverAbbreviation(referenceLap.driverName)
      : 'REF';
    
    return {
      labels,
      datasets: [
        {
          label: `Geschw. ${selectedDriverAbbr} (km/h)`,
          data: alignedData.map(d => d.selSpeed),
          borderColor: '#06b6d4', // Cyan
          borderWidth: 2,
          yAxisID: 'yLeft',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: `Geschw. ${refDriverAbbr} (km/h)`,
          data: alignedData.map(d => d.refSpeed),
          borderColor: '#f43f5e', // Rose
          borderWidth: 2,
          yAxisID: 'yLeft',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: `Gas ${selectedDriverAbbr} (%)`,
          data: alignedData.map(d => d.selThrottle * 100),
          borderColor: 'rgba(16, 185, 129, 0.65)', // Emerald slightly muted
          borderWidth: 1.5,
          yAxisID: 'yRight',
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: `Bremse ${selectedDriverAbbr} (%)`,
          data: alignedData.map(d => d.selBrake * 100),
          borderColor: 'rgba(239, 68, 68, 0.65)', // Red slightly muted
          borderWidth: 1.5,
          yAxisID: 'yRight',
          tension: 0.1,
          pointRadius: 0
        }
      ]
    };
  }, [resampledComparison, selectedDriverIndex, referenceLap, sessionData]);

  // Custom ChartJS plugin to draw vertical cursor lines at active distances
  const verticalLinePlugin = useMemo(() => {
    return {
      id: 'verticalLine',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        
        ctx.save();
        
        // 1. Draw Driver 1 (Green) line
        if (d1Distance !== null && d1Distance !== undefined) {
          const xPixel1 = x.getPixelForValue(d1Distance);
          if (xPixel1 >= left && xPixel1 <= right) {
            ctx.beginPath();
            ctx.moveTo(xPixel1, top);
            ctx.lineTo(xPixel1, bottom);
            ctx.strokeStyle = '#22c55e'; // Green
            ctx.lineWidth = 2.0;
            ctx.stroke();
            
            // Dot at the top intersection
            ctx.beginPath();
            ctx.arc(xPixel1, top, 4.0, 0, 2 * Math.PI);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
        
        // 2. Draw Driver 2 (Team Color / Rose) line
        if (d2Distance !== null && d2Distance !== undefined) {
          const xPixel2 = x.getPixelForValue(d2Distance);
          if (xPixel2 >= left && xPixel2 <= right) {
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(xPixel2, top);
            ctx.lineTo(xPixel2, bottom);
            ctx.strokeStyle = d2Color;
            ctx.lineWidth = 2.0;
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
            
            // Dot at the top intersection
            ctx.beginPath();
            ctx.arc(xPixel2, top, 4.0, 0, 2 * Math.PI);
            ctx.fillStyle = d2Color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
        
        // 3. Draw a thin cyan guide line if user is scrubbing (paused and hover active)
        if (!isPlaying && chartCursorDistance !== null && chartCursorDistance !== undefined) {
          const xPixelCursor = x.getPixelForValue(chartCursorDistance);
          if (xPixelCursor >= left && xPixelCursor <= right) {
            ctx.beginPath();
            ctx.moveTo(xPixelCursor, top);
            ctx.lineTo(xPixelCursor, bottom);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // Transparent Cyan
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
        
        ctx.restore();
      }
    };
  }, [d1Distance, d2Distance, d2Color, isPlaying, chartCursorDistance]);

  // Shared chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    onHover: (event, activeElements) => {
      if (activeElements && activeElements.length > 0) {
        const index = activeElements[0].index;
        if (resampledComparison && resampledComparison.alignedData[index]) {
          const dist = resampledComparison.alignedData[index].lapDistance;
          setChartCursorDistance(dist);
          // Sync playbackTime if not currently playing
          if (!isPlaying && activeCompareLap) {
            const elapsed = getElapsedAtDistance(activeCompareLap, dist);
            setPlaybackTime(elapsed);
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: "'Share Tech Mono', monospace", size: 10 },
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleFont: { family: "'Orbitron', sans-serif", size: 10 },
        bodyFont: { family: "'Share Tech Mono', monospace" }
      }
    },
    scales: {
      x: {
        type: 'linear',
        min: zoomRange ? zoomRange[0] : undefined,
        max: zoomRange ? zoomRange[1] : undefined,
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: {
          color: '#64748b',
          font: { family: "'Share Tech Mono', monospace", size: 9 },
          callback: (v) => `${v}m`
        }
      }
    }
  };

  const deltaOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => `Zeitunterschied: ${context.parsed.y > 0 ? '+' : ''}${context.parsed.y.toFixed(3)}s`
        }
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: {
          color: '#eab308',
          font: { family: "'Share Tech Mono', monospace", size: 10 },
          callback: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`
        }
      }
    }
  };

  const telemetryOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      yLeft: {
        type: 'linear',
        position: 'left',
        min: 0,
        max: 360,
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: {
          color: '#64748b',
          font: { family: "'Share Tech Mono', monospace", size: 9 },
          callback: (v) => `${v} km/h`
        }
      },
      yRight: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 105,
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#64748b',
          font: { family: "'Share Tech Mono', monospace", size: 9 },
          callback: (v) => `${v}%`
        }
      }
    }
  };

  const activeDriverInfo = useMemo(() => {
    if (selectedDriverIndex === null) return null;
    return sessionData.drivers.find(d => d.index === selectedDriverIndex) || null;
  }, [sessionData, selectedDriverIndex]);

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto p-6 custom-scrollbar animate-fade-in">
      
      {/* Top Banner Dashboard (Unified Row 1) */}
      <div className="bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        {/* Title and Back Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={onBack}
            className="p-2 bg-[#1e293b] hover:bg-[#334155] border border-[#334155]/60 hover:border-sky-500/50 text-slate-200 hover:text-white rounded-lg transition duration-200 active:scale-95 shadow-sm flex items-center justify-center"
            title="Zurück zur Simulation"
          >
            <ChevronRight className="rotate-180 text-sky-400" size={18} />
          </button>
          <div>
            <h2 className="text-sm font-orbitron font-black text-slate-100 tracking-wider flex items-center gap-1.5">
              <Award className="text-sky-400" size={16} />
              <span>COACHING: {sessionData.trackName}</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-sans">
              Lap-by-lap telemetry comparison
            </p>
          </div>
        </div>

        {/* Selectors Group (Driver & Lap Dropdowns) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Driver Selector */}
          <div className="flex items-center gap-2 bg-[#070a13] px-3 py-1.5 rounded-xl border border-[#1e293b] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase shrink-0">Fahrer:</label>
            <select
              value={selectedDriverIndex !== null ? selectedDriverIndex : ''}
              onChange={(e) => {
                setSelectedDriverIndex(parseInt(e.target.value));
                setSelectedCompareLapNum(null);
              }}
              className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold font-sans w-full sm:w-36 lg:w-40"
            >
              {sessionData.drivers.map(d => {
                const hasLaps = driversLaps[d.index] && driversLaps[d.index].length > 0;
                return (
                  <option key={d.index} value={d.index} disabled={!hasLaps}>
                    [{getDriverAbbreviation(d.name)}] {d.name} {!hasLaps ? '(Keine Telemetrie)' : d.isHuman ? '(Mensch)' : '(KI)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lap Selector (Rundenübersicht Dropdown) */}
          <div className="flex items-center gap-2 bg-[#070a13] px-3 py-1.5 rounded-xl border border-[#1e293b] flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase shrink-0">Runde:</label>
            <select
              value={selectedCompareLapNum !== null ? selectedCompareLapNum : ''}
              onChange={(e) => setSelectedCompareLapNum(parseInt(e.target.value))}
              className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold font-sans w-full sm:w-44 lg:w-48 font-mono"
            >
              {selectedDriverLaps.map(lap => {
                const isReference = referenceLap && referenceLap.lapNum === lap.lapNum && referenceLap.driverIndex === selectedDriverIndex;
                return (
                  <option key={lap.lapNum} value={lap.lapNum}>
                    R{lap.lapNum} - {formatLapTime(lap.duration)} | Ø: {lap.avgSpeed} | Top: {lap.maxSpeed} {isReference ? '★ BEST' : ''}
                  </option>
                );
              })}
              {selectedDriverLaps.length === 0 && (
                <option value="">Keine Runden</option>
              )}
            </select>
          </div>
        </div>

        {/* HUD Metrics Banner */}
        {activeCompareLap && referenceLap && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end flex-1">
            {/* Selected Lap */}
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-500 font-mono uppercase tracking-widest">Runde</span>
              <span className="font-orbitron font-extrabold text-xs text-sky-400">
                L{activeCompareLap.lapNum} <span className="font-mono text-slate-300 font-bold ml-1">{formatLapTime(activeCompareLap.duration)}</span>
              </span>
            </div>

            <div className="h-6 w-[1px] bg-[#1e293b] hidden sm:block"></div>

            {/* Reference Lap */}
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-rose-400/80 font-mono uppercase tracking-widest">Referenz</span>
              <span className="font-orbitron font-extrabold text-xs text-rose-500">
                {referenceLap.driverIndex === selectedDriverIndex ? 'SELBST' : getDriverAbbreviation(referenceLap.driverName)}
                <span className="font-mono text-slate-300 font-bold ml-1">{formatLapTime(referenceLap.duration)}</span>
              </span>
            </div>

            <div className="h-6 w-[1px] bg-[#1e293b] hidden sm:block"></div>

            {/* Delta Gap */}
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-500 font-mono uppercase tracking-widest">Delta (Gap)</span>
              {(() => {
                const gap = activeCompareLap.duration - referenceLap.duration;
                const isFaster = gap < 0;
                return (
                  <span className={`font-orbitron font-extrabold text-xs ${isFaster ? 'text-emerald-400' : gap === 0 ? 'text-slate-400' : 'text-amber-500'}`}>
                    {isFaster ? '' : gap === 0 ? '' : '+'}{gap.toFixed(3)}s
                  </span>
                );
              })()}
            </div>

            <div className="h-6 w-[1px] bg-[#1e293b] hidden sm:block"></div>

            {/* Potential Gain */}
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-emerald-400 font-mono uppercase tracking-widest">Potenzial</span>
              <span className="font-orbitron font-extrabold text-xs text-emerald-400">
                -{totalPotentialTimeSaved.toFixed(3)}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Telemetry Charts (Side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 h-[240px]">
        {/* Delta-T Chart */}
        <div className="bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl flex flex-col gap-2 min-h-0 shadow-lg">
          <div className="flex justify-between items-center border-b border-[#1e293b]/70 pb-1 shrink-0">
            <span className="text-xs font-orbitron font-extrabold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
              <Activity size={14} className="text-yellow-500" />
              DELTA-TIME VERGLEICH (Δt)
            </span>
            <div className="flex items-center gap-3">
              {focusedZone && (
                <button
                  onClick={() => setZoomToSelected(!zoomToSelected)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans transition duration-200 ${
                    zoomToSelected
                      ? 'bg-yellow-500 text-slate-950 border border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.25)] animate-pulse'
                      : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] border border-[#334155]/60 hover:text-white'
                  }`}
                  title="Zoom auf den ausgewählten Kurvenbereich umschalten"
                >
                  🔍 Zoom: {zoomToSelected ? 'Aktiv' : 'Aus'}
                </button>
              )}
              <span className="text-[9px] text-slate-400 font-sans italic hidden sm:inline">
                Zeitunterschied in Sekunden
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-[#070a13]/80 rounded-lg p-2 border border-[#1e293b]">
            {resampledComparison ? (
              <Line 
                data={deltaChartData} 
                options={deltaOptions} 
                plugins={[verticalLinePlugin]}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs italic">
                Lade Delta-T...
              </div>
            )}
          </div>
        </div>

        {/* Speed & Pedals Chart */}
        <div className="bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl flex flex-col gap-2 min-h-0 shadow-lg">
          <div className="flex justify-between items-center border-b border-[#1e293b]/70 pb-1 shrink-0">
            <span className="text-xs font-orbitron font-extrabold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
              <Gauge size={14} className="text-cyan-500" />
              GESCHWINDIGKEIT & PEDALE
            </span>
            <div className="flex items-center gap-3">
              {focusedZone && (
                <button
                  onClick={() => setZoomToSelected(!zoomToSelected)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans transition duration-200 ${
                    zoomToSelected
                      ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.25)] animate-pulse'
                      : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] border border-[#334155]/60 hover:text-white'
                  }`}
                  title="Zoom auf den ausgewählten Kurvenbereich umschalten"
                >
                  🔍 Zoom: {zoomToSelected ? 'Aktiv' : 'Aus'}
                </button>
              )}
              <span className="text-[9px] text-slate-400 font-sans italic hidden sm:inline">
                Vergleich in km/h / Pedal-%
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-[#070a13]/80 rounded-lg p-2 border border-[#1e293b]">
            {resampledComparison ? (
              <Line 
                data={telemetryChartData} 
                options={telemetryOptions} 
                plugins={[verticalLinePlugin]}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs italic">
                Lade Geschwindigkeit...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playback Control Bar (Glassmorphism) */}
      {activeCompareLap && referenceLap && (
        <div className="w-full bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl flex flex-col gap-4 shadow-lg shrink-0 animate-fade-in">
          {/* Top Row: Playback Scrubbing Controls */}
          <div className="w-full flex flex-col md:flex-row items-center gap-4">
            {/* Left: Action controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Play/Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl border transition duration-200 active:scale-95 flex items-center justify-center ${
                  isPlaying 
                    ? 'bg-emerald-500/25 border-emerald-500/55 text-emerald-400 hover:bg-emerald-500/35 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                    : 'bg-[#1e293b] border-[#334155]/60 text-slate-200 hover:bg-[#334155] hover:text-white'
                }`}
                title={isPlaying ? 'Pause' : 'Abspielen'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              {/* Reset */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackTime(0);
                  setChartCursorDistance(0);
                  setFollowDriver(true);
                }}
                className="p-2.5 bg-[#1e293b] border border-[#334155]/60 hover:bg-[#334155] hover:border-slate-500/40 text-slate-300 hover:text-white rounded-xl transition duration-200 active:scale-95 flex items-center justify-center"
                title="Zurücksetzen"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Middle: Scrubber and Time labels */}
            <div className="flex-1 flex items-center gap-3 w-full">
              <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0 min-w-[45px] text-right">
                {playbackTime.toFixed(2)}s
              </span>
              
              <input
                type="range"
                min={0}
                max={maxDuration}
                step={0.01}
                value={playbackTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  setPlaybackTime(time);
                  if (activeCompareLap) {
                    const dist = getDistanceAtElapsed(activeCompareLap, time);
                    setChartCursorDistance(dist);
                  }
                }}
                className="flex-1 h-1.5 bg-[#070a13] rounded-lg appearance-none cursor-pointer accent-sky-500 border border-[#1e293b] focus:outline-none"
              />
              
              <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0 min-w-[45px]">
                {maxDuration.toFixed(2)}s
              </span>
            </div>

            {/* Right: Speed Selectors */}
            <div className="flex bg-[#070a13] border border-[#1e293b] rounded-xl p-0.5 shrink-0">
              {[0.25, 0.5, 0.75, 1.0].map((speed) => {
                const active = playbackSpeed === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-orbitron font-extrabold transition duration-150 active:scale-95 ${
                      active 
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(14,165,233,0.35)]' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed === 1.0 ? '1x' : `${speed}x`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Map Camera & Trail Toggles */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-[#1e293b]/70 pt-3 gap-3">
            {/* Camera settings */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-orbitron font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                Kamera:
              </span>
              
              {/* Follow Camera Toggle */}
              <button
                onClick={() => setFollowDriver(!followDriver)}
                className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-orbitron font-extrabold transition duration-200 active:scale-95 ${
                  followDriver 
                    ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                    : 'bg-[#070a13] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white'
                }`}
              >
                {followDriver ? 'FOLGEN AKTIV' : 'FOLGEN'}
              </button>

              {/* Zoom Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#070a13] px-2.5 py-1 rounded-xl border border-[#1e293b]">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">Ausschnitt:</label>
                <select
                  value={followZoomEnvelope}
                  onChange={(e) => {
                    setFollowZoomEnvelope(parseInt(e.target.value));
                    setFollowDriver(true); // Automatically re-enable follow mode on zoom envelope change
                  }}
                  className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-sky-500 font-semibold font-mono"
                >
                  <option value={50}>50 m</option>
                  <option value={100}>100 m</option>
                  <option value={200}>200 m</option>
                  <option value={500}>500 m</option>
                </select>
              </div>
            </div>

            {/* Line Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-orbitron font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Linien:
              </span>

              {/* Ideallinie Toggle */}
              <button
                onClick={() => setShowRaceline(!showRaceline)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-orbitron font-extrabold transition duration-200 active:scale-95 flex items-center gap-1.5 ${
                  showRaceline 
                    ? 'bg-blue-500/25 border-blue-500/50 text-blue-400 hover:bg-blue-500/35 shadow-[0_0_8px_rgba(59,130,246,0.15)]' 
                    : 'bg-[#070a13] border-[#1e293b] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${showRaceline ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
                Ideallinie
              </button>

              {/* Spur Fahrer Toggle */}
              <button
                onClick={() => setShowD1Trail(!showD1Trail)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-orbitron font-extrabold transition duration-200 active:scale-95 flex items-center gap-1.5 ${
                  showD1Trail 
                    ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                    : 'bg-[#070a13] border-[#1e293b] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${showD1Trail ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                Spur Fahrer
              </button>

              {/* Spur Bestzeit Toggle */}
              <button
                onClick={() => setShowD2Trail(!showD2Trail)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-orbitron font-extrabold transition duration-200 active:scale-95 flex items-center gap-1.5 ${
                  showD2Trail 
                    ? 'bg-rose-500/25 border-rose-500/50 text-rose-400 hover:bg-rose-500/35 shadow-[0_0_8px_rgba(244,63,94,0.15)]' 
                    : 'bg-[#070a13] border-[#1e293b] text-slate-400 hover:text-slate-200'
                }`}
                style={showD2Trail ? {
                  backgroundColor: `${d2Color}15`,
                  borderColor: `${d2Color}50`,
                  color: d2Color
                } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: showD2Trail ? d2Color : '#475569' }}></span>
                Spur Bestzeit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Full Width Track Map */}
      <div className="w-full flex flex-col min-h-[400px] h-[450px] bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl relative shadow-lg shrink-0">
        <div className="flex justify-between items-center border-b border-[#1e293b]/70 pb-2 shrink-0">
          <span className="text-xs font-orbitron font-extrabold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
            STRECKEN-HEATMAP & FAHRLINIE
          </span>
          <span className="text-[9px] text-slate-400 font-sans italic">
            Rot = Zeitverlust | Grün = Optimal/Gewinn
          </span>
        </div>
        
        <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-[#1e293b]/50 mt-2">
            <TrackMap
              telemetryData={sessionData.telemetry}
              drivers={sessionData.drivers}
              currentTime={0}
              driver1Index={selectedDriverIndex}
              driver2Index={referenceLap ? referenceLap.driverIndex : null}
              onSelectDriver={() => {}}
              trackName={sessionData.trackName}
              sessionFilename={sessionData.filename}
              status={sessionData.status}
              avgError={sessionData.avgError}
              heatmapPoints={resampledComparison?.heatmapPoints || null}
              highlightedZone={hoveredZone}
              focusedZone={focusedZone}
              coachingMode={true}
              driver1Time={activeCompareLap ? activeCompareLap.startSessionTime + Math.min(playbackTime, activeCompareLap.duration) : 0}
              driver2Time={referenceLap ? referenceLap.startSessionTime + Math.min(playbackTime, referenceLap.duration) : 0}
              driver1LapNum={activeCompareLap ? activeCompareLap.lapNum : 0}
              driver2LapNum={referenceLap ? referenceLap.lapNum : 0}
              showRaceline={showRaceline}
              showD1Trail={showD1Trail}
              showD2Trail={showD2Trail}
              followDriver={followDriver}
              setFollowDriver={setFollowDriver}
              followZoomEnvelope={followZoomEnvelope}
            />
        </div>
      </div>

      {/* Row 4: Full Width Corner Analysis */}
      <div className="bg-[#0f172a]/65 backdrop-blur-md border border-[#1e293b] p-4 rounded-2xl flex flex-col min-h-[300px] shadow-lg shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1e293b] pb-3 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-orbitron font-extrabold text-slate-300 uppercase flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              KURVEN-ANALYSE ({filteredCornerEvaluations.length})
            </h3>
            {totalPotentialTimeSaved > 0 && (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline-block">
                POTENZIAL: -{totalPotentialTimeSaved.toFixed(3)}s
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Filter:</span>
            <div className="flex bg-[#070a13] border border-[#1e293b] rounded-lg p-0.5">
              <button
                onClick={() => setShowOnlyImprovements(false)}
                className={`px-2 py-1 rounded text-[10px] font-bold font-sans transition duration-150 ${
                  !showOnlyImprovements
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alle Kurven
              </button>
              <button
                onClick={() => setShowOnlyImprovements(true)}
                className={`px-2 py-1 rounded text-[10px] font-bold font-sans transition duration-150 ${
                  showOnlyImprovements
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nur Verbesserungen
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto mt-4 pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCornerEvaluations.map((evt) => {
              const isHovered = hoveredZone && hoveredZone.startDistance === evt.startDistance && hoveredZone.endDistance === evt.endDistance;
              const isActive = activeCornerId === evt.id;
              
              // Color configuration based on severity of loss / gain
              let cardBorder = 'border-[#1e293b] hover:border-slate-500';
              let labelStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
              let statusLabel = 'NEUTRAL';
              
              if (evt.category === 'gain') {
                cardBorder = 'border-emerald-500/20 hover:border-emerald-500/40';
                labelStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                statusLabel = 'GEWINN';
              } else if (evt.category === 'neutral') {
                cardBorder = 'border-slate-800 hover:border-slate-700';
                labelStyle = 'bg-slate-800/40 text-slate-400 border-slate-700/50';
                statusLabel = 'KONSTANT';
              } else {
                // lost time
                if (evt.cornerDelta >= 0.15) {
                  cardBorder = 'border-red-500/25 hover:border-red-500/50';
                  labelStyle = 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
                  statusLabel = 'KRITISCH';
                } else {
                  cardBorder = 'border-amber-500/20 hover:border-amber-500/40';
                  labelStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                  statusLabel = 'VERLUST';
                }
              }
              
              if (isActive) {
                cardBorder = 'border-sky-500 ring-1 ring-sky-500/30 bg-[#0f172a] shadow-[0_0_15px_rgba(6,182,212,0.15)]';
              } else if (isHovered) {
                cardBorder = 'border-slate-500 bg-[#0c0f18]';
              }

              return (
                <div
                  key={evt.id}
                  onMouseEnter={() => setHoveredZone({ startDistance: evt.startDistance, endDistance: evt.endDistance })}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => handleCornerClick(evt)}
                  className={`bg-[#070a13]/90 border rounded-xl p-4 transition duration-200 cursor-pointer ${cardBorder}`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-2.5">
                    <div>
                      <span className="text-xs font-bold font-orbitron text-slate-200 tracking-wider">
                        {evt.name}: {evt.direction}
                      </span>
                      <span className="block text-[9px] font-mono text-slate-500">
                        Bereich: {Math.round(evt.startDistance)}m - {Math.round(evt.endDistance)}m
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${labelStyle}`}>
                        {evt.cornerDelta > 0 ? '+' : ''}{evt.cornerDelta.toFixed(3)}s
                      </span>
                      <span className="text-[8px] font-sans font-bold text-slate-500 tracking-wider">{statusLabel}</span>
                    </div>
                  </div>

                  {/* Speed delta indicator */}
                  <div className="flex justify-between items-center text-[10px] font-mono bg-[#0f172a]/30 p-2 rounded-lg border border-[#1e293b]/40 mb-3">
                    <span className="text-slate-400">Apex-Mindestgeschwindigkeit:</span>
                    <div className="flex gap-2">
                      <span className="text-sky-400 font-bold">Du: {Math.round(evt.selMinSpeed)} km/h</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-rose-500 font-bold">Ref: {Math.round(evt.refMinSpeed)} km/h</span>
                    </div>
                  </div>

                  {/* Diagnostic Explanation */}
                  <div className="flex items-start gap-2.5 mb-3 bg-[#0f172a]/20 p-2.5 rounded-lg border border-[#1e293b]/30">
                    <AlertTriangle className={evt.category === 'gain' ? "text-emerald-400 shrink-0 mt-0.5" : evt.cornerDelta >= 0.15 ? "text-red-400 shrink-0 mt-0.5" : "text-amber-500 shrink-0 mt-0.5"} size={14} />
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-slate-300 font-sans uppercase tracking-wider">Analyse:</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans font-medium">
                        {evt.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Coaching Instruction */}
                  <div className="flex items-start gap-2.5 pl-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${evt.category === 'gain' ? 'bg-emerald-400' : 'bg-sky-400'}`}></div>
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold font-sans ${evt.category === 'gain' ? 'text-emerald-400' : 'text-sky-400'}`}>Coaching-Tipp:</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        {evt.advice}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCornerEvaluations.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 font-sans italic border border-dashed border-[#1e293b] rounded-xl p-6">
                <Info className="mx-auto mb-2 text-slate-600" size={24} />
                <p className="font-bold text-slate-400 uppercase">Keine Kurven</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Es sind keine Kurven vorhanden, die dem aktuellen Filter entsprechen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DriverCoach;

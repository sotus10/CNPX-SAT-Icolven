const day = 24 * 60 * 60 * 1000;
const now = Date.now();

const seq = (n, fn) => Array.from({ length: n }, (_, i) => fn(i, n));
const scale = (spark, factor) => spark.map((v) => Math.max(1, Math.round(v * factor)));
const wave = (i, offset = 0) => Math.sin(i / 2 + offset) * 0.18 + Math.cos(i / 4 + offset) * 0.12;

const BASIN_PROFILES = {
  capacete: {
    id: 'capacete',
    name: 'Río Capacete',
    level: 6.42,
    zone: 'naranja',
    critical: 3,
    population: 2400,
    online: 94.3,
    flow: 1860,
    api: 81,
    slopes: 9,
    color: '#ef4444',
    subtitle: 'Nivel 6,42 m · naranja',
  },
  lujan: {
    id: 'lujan',
    name: 'Río Luján',
    level: 6.1,
    zone: 'amarillo',
    critical: 2,
    population: 4100,
    online: 95.8,
    flow: 1240,
    api: 77,
    slopes: 6,
    color: '#f59e0b',
    subtitle: 'Nivel 6,10 m · amarillo',
  },
  reconquista: {
    id: 'reconquista',
    name: 'Río Reconquista',
    level: 5.96,
    zone: 'amarillo',
    critical: 1,
    population: 6200,
    online: 97.1,
    flow: 980,
    api: 69,
    slopes: 14,
    color: '#f59e0b',
    subtitle: 'Nivel 5,96 m · amarillo',
  },
  salado: {
    id: 'salado',
    name: 'Río Salado',
    level: 4.32,
    zone: 'normal',
    critical: 0,
    population: 850,
    online: 98.2,
    flow: 540,
    api: 58,
    slopes: 5,
    color: '#1b59f8',
    subtitle: 'Nivel 4,32 m · normal',
  },
  parana: {
    id: 'parana',
    name: 'Río Paraná',
    level: 3.1,
    zone: 'normal',
    critical: 0,
    population: 300,
    online: 99.0,
    flow: 820,
    api: 49,
    slopes: 2,
    color: '#22c55e',
    subtitle: 'Nivel 3,10 m · normal',
  },
};

export const BASINS = Object.values(BASIN_PROFILES);

export const STATIONS = [
  { id: 'paso-castro', name: 'Estación Paso Castro', basin: 'reconquista', type: 'limnimétrica', level: 6.42, rise: 18, discharge: 1485, rainfall: 86, intensity: 42, reservoir: 78 },
  { id: 'santa-lucia', name: 'Estación Santa Lucía', basin: 'lujan', type: 'limnimétrica', level: 6.1, rise: 12, discharge: 1240, rainfall: 64, intensity: 30, reservoir: 71 },
  { id: 'cuatro-bocas', name: 'Estación Cuatro Bocas', basin: 'capacete', type: 'hidrometeorológica', level: 5.96, rise: 8, discharge: 980, rainfall: 48, intensity: 22, reservoir: 78 },
  { id: 'capacete', name: 'Embalse Capacete', basin: 'capacete', type: 'azud-embalse', level: 4.32, rise: 3, discharge: 540, rainfall: 22, intensity: 10, reservoir: 92 },
];

const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const BASIN_BY_ID = Object.fromEntries(BASINS.map((b) => [b.id, b]));

export const mockBasinKPIs = [
  {
    id: 'cuencas_alert',
    label: 'Cuencas en alerta',
    value: 2,
    unit: 'de 6',
    change: 0,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [1, 1, 2, 1, 2, 2, 2, 2],
    subtext: 'semáforo naranja · Río Capacete y Río Luján',
    operationalDetails: [
      { label: 'Cota / borde de banca', value: '3,20 m / 4,00 m cota crítica' },
      { label: 'Caudal instantáneo', value: '1.860 m³/s' },
      { label: 'Tendencia del nivel', value: 'Subiendo ↗' },
    ],
  },
  {
    id: 'stations_critical',
    label: 'Estaciones en estado crítico',
    value: 5,
    unit: '',
    change: 2,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [3, 4, 3, 5, 6, 5, 4, 5],
    subtext: '3 sin telemetría · 148 en operación',
  },
  {
    id: 'population_at_risk',
    label: 'Población en zona de influencia',
    value: 12850,
    unit: 'hab',
    change: 4.3,
    changeLabel: 'estimación',
    status: 'negative',
    spark: [40, 44, 46, 51, 54, 58, 62, 66],
    subtext: 'bajo potencial de afectación',
  },
  {
    id: 'network_online',
    label: 'Red de sensores en línea',
    value: 96.4,
    unit: '%',
    change: 1.2,
    changeLabel: 'vs semana anterior',
    status: 'positive',
    spark: [90, 91, 92, 93, 95, 95, 96, 96],
    subtext: '152 de 158 estaciones reportan',
  },
  {
    id: 'mean_streamflow',
    label: 'Caudal promedio (cuencas)',
    value: 1485,
    unit: 'm³/s',
    change: 12.4,
    changeLabel: 'vs histórico',
    status: 'negative',
    spark: [40, 46, 44, 52, 55, 60, 62, 66],
    subtext: 'promedio móvil de 7 días',
  },
  {
    id: 'api_saturation',
    label: 'Índice API de saturación',
    value: 74,
    unit: '%',
    change: 6.8,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [55, 58, 60, 63, 66, 69, 71, 74],
    subtext: 'tendencia creciente hacia GEO-API-85',
  },
];

export const mockHydrologyKPIs = [
  {
    id: 'river_level',
    label: 'Nivel · Río Reconquista',
    value: 6.42,
    unit: 'm',
    change: 18.0,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [42, 44, 49, 53, 57, 60, 62, 64],
    subtext: 'cota amarilla 5,8 · naranja 6,5 · roja 7,4 m',
  },
  {
    id: 'rise_rate',
    label: 'Velocidad de ascenso',
    value: 18,
    unit: 'cm/h',
    change: 12,
    changeLabel: 'vs 12 h',
    status: 'negative',
    spark: [50, 54, 55, 62, 66, 68, 72, 76],
    subtext: 'crecida súbita FLV-RISE-60 a 60 cm/h',
  },
  {
    id: 'discharge',
    label: 'Caudal',
    value: 1485,
    unit: 'm³/s',
    change: 9.6,
    changeLabel: 'vs promedio',
    status: 'negative',
    spark: [40, 44, 47, 50, 54, 57, 60, 62],
    subtext: 'umbral de alerta en 1.900 m³/s',
  },
  {
    id: 'rainfall_24h',
    label: 'Lluvia acumulada 24 h',
    value: 86,
    unit: 'mm',
    change: 33,
    changeLabel: 'vs día anterior',
    status: 'negative',
    spark: [30, 40, 45, 52, 60, 70, 78, 86],
    subtext: 'PPT-ACC-100 cercano al umbral',
  },
  {
    id: 'rain_intensity',
    label: 'Intensidad máxima (1 h)',
    value: 42,
    unit: 'mm/h',
    change: 18,
    changeLabel: 'vs 6 h',
    status: 'negative',
    spark: [55, 60, 58, 66, 70, 74, 78, 82],
    subtext: 'PPT-INT-50 a 50 mm/h',
  },
  {
    id: 'reservoir',
    label: 'Embalse Capacete',
    value: 92,
    unit: '%',
    change: 4.5,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [60, 66, 72, 76, 82, 86, 90, 92],
    subtext: 'RES-CAP-90 superado · compuertas parciales',
  },
];

export const mockPredictiveKPIs = [
  {
    id: 'exceed_prob',
    label: 'Prob. superación cota naranja (24 h)',
    value: 62,
    unit: '%',
    change: 14,
    changeLabel: 'vs pronóstico previo',
    status: 'negative',
    spark: [40, 44, 48, 50, 54, 58, 60, 62],
    subtext: 'modelo Muskingum + ARIMA',
  },
  {
    id: 'forecast_level',
    label: 'Pronóstico nivel 12 h',
    value: 7.05,
    unit: 'm',
    change: 9,
    changeLabel: 'vs actual',
    status: 'negative',
    spark: [42, 46, 50, 55, 60, 64, 68, 70],
    subtext: 'trayectoria hacia cota roja 7,40 m',
  },
  {
    id: 'peak_time',
    label: 'Hora pico estimada',
    value: '03:00',
    unit: '',
    change: 0,
    changeLabel: '',
    status: 'neutral',
    spark: [],
    subtext: 'ventana de confianza ±45 min',
  },
  {
    id: 'model_error',
    label: 'Margen de error del modelo',
    value: 0.12,
    unit: 'm',
    change: -8,
    changeLabel: 'mejora',
    status: 'positive',
    spark: [80, 76, 72, 68, 64, 60, 56, 48],
    subtext: 'MAPE 7,8% · validación cruzada',
  },
  {
    id: 'runoff',
    label: 'Escorrentía esperada',
    value: 210,
    unit: 'mm',
    change: 25,
    changeLabel: 'vs normal',
    status: 'negative',
    spark: [35, 45, 55, 65, 75, 85, 95, 105],
    subtext: 'por transformación lluvia-caudal',
  },
  {
    id: 'slope_risk',
    label: 'Laderas con riesgo geotécnico',
    value: 14,
    unit: '',
    change: 3,
    changeLabel: 'vs ayer',
    status: 'negative',
    spark: [30, 32, 36, 40, 44, 47, 50, 56],
    subtext: 'GEO-API 74% · monitoreo de laderas',
  },
];

export const mockBasinKpisByBasin = Object.fromEntries(
  BASINS.map((basin) => {
    const base = mockBasinKPIs;
    const [riskStatus, riskSpark] =
      basin.zone === 'naranja'
        ? ['negative', scale(base[0].spark, 1.35)]
        : basin.zone === 'amarillo'
          ? ['negative', scale(base[0].spark, 1.1)]
          : ['neutral', scale(base[0].spark, 0.7)];

    return [
      basin.id,
      [
        {
          ...base[0],
          label: `Riesgo actual · ${basin.name}`,
          value: basin.level,
          unit: 'm',
          status: riskStatus,
          spark: riskSpark,
          operationalDetails: [
            { label: 'Cota / borde de banca', value: `${basin.level.toFixed(2).replace('.', ',')} m / 7,00 m cota crítica` },
            { label: 'Caudal instantáneo', value: `${basin.flow.toLocaleString('es-AR')} m³/s` },
            { label: 'Tendencia del nivel', value: basin.zone === 'normal' ? 'Estable ➔' : 'Subiendo ↗' },
          ],
          subtext:
            basin.zone === 'naranja'
              ? 'cota naranja superada · sirena activa'
              : basin.zone === 'amarillo'
                ? 'próximo a cota amarilla'
                : 'dentro de cotas normales',
        },
        {
          ...base[1],
          label: 'Estaciones en estado crítico',
          value: basin.critical,
          unit: '',
          status: basin.critical > 0 ? 'negative' : 'positive',
          spark: scale(base[1].spark, basin.critical / 5 || 0.2),
          subtext: `${basin.name} · telemetría en revisión`,
        },
        {
          ...base[2],
          label: 'Población en zona de influencia',
          value: basin.population,
          status: basin.zone === 'normal' ? 'neutral' : 'negative',
          spark: scale(base[2].spark, basin.population / 12850),
          subtext: `${basin.name} · potencial de afectación`,
        },
        {
          ...base[3],
          label: 'Red de sensores en línea',
          value: basin.online,
          unit: '%',
          status: 'positive',
          spark: scale(base[3].spark, basin.online / 96.4),
          subtext: `${basin.name} · sensores reportando`,
        },
        {
          ...base[4],
          label: 'Caudal promedio',
          value: basin.flow,
          unit: 'm³/s',
          status: basin.zone === 'normal' ? 'neutral' : 'negative',
          spark: scale(base[4].spark, basin.flow / 1485),
          subtext: 'promedio móvil de 7 días',
        },
        {
          ...base[5],
          label: 'Índice API de saturación',
          value: basin.api,
          unit: '%',
          status: basin.api > 74 ? 'negative' : 'neutral',
          spark: scale(base[5].spark, basin.api / 74),
          subtext: `GEO-API-70 · ${basin.api}% en ${basin.name}`,
        },
      ],
    ];
  })
);

export const getBasinKpis = (basinId) => {
  if (!basinId || basinId === 'all') return mockBasinKPIs;
  return mockBasinKpisByBasin[basinId] ?? mockBasinKPIs;
};

export const mockHydrologyKpisByStation = Object.fromEntries(
  STATIONS.map((station) => [
    station.id,
    [
      {
        ...mockHydrologyKPIs[0],
        label: `Nivel · ${station.name}`,
        value: station.level,
        unit: 'm',
        status: station.basin === 'capacete' ? 'negative' : 'neutral',
        spark: scale(mockHydrologyKPIs[0].spark, station.level / 6.42),
        subtext: `${station.type} · ${BASIN_BY_ID[station.basin].name}`,
      },
      {
        ...mockHydrologyKPIs[1],
        label: 'Velocidad de ascenso',
        value: station.rise,
        unit: 'cm/h',
        spark: scale(mockHydrologyKPIs[1].spark, station.rise / 18),
        subtext: 'crecida súbita FLV-RISE-60 a 60 cm/h',
      },
      {
        ...mockHydrologyKPIs[2],
        label: 'Caudal',
        value: station.discharge,
        unit: 'm³/s',
        spark: scale(mockHydrologyKPIs[2].spark, station.discharge / 1485),
        subtext: 'umbral de alerta en 1.900 m³/s',
      },
      {
        ...mockHydrologyKPIs[3],
        label: 'Lluvia acumulada 24 h',
        value: station.rainfall,
        unit: 'mm',
        spark: scale(mockHydrologyKPIs[3].spark, station.rainfall / 86),
        subtext: 'PPT-ACC-100 cercano al umbral',
      },
      {
        ...mockHydrologyKPIs[4],
        label: 'Intensidad máxima (1 h)',
        value: station.intensity,
        unit: 'mm/h',
        spark: scale(mockHydrologyKPIs[4].spark, station.intensity / 42),
        subtext: 'PPT-INT-50 a 50 mm/h',
      },
      {
        ...mockHydrologyKPIs[5],
        label: 'Embalse de referencia',
        value: station.reservoir,
        unit: '%',
        spark: scale(mockHydrologyKPIs[5].spark, station.reservoir / 92),
        subtext: station.id === 'capacete' ? 'RES-CAP-90 superado · compuertas parciales' : 'capacidad del embalse de la cuenca',
      },
    ],
  ])
);

export const getHydrologyKpis = (stationId) => {
  if (!stationId) return mockHydrologyKPIs;
  return mockHydrologyKpisByStation[stationId] ?? mockHydrologyKPIs;
};

const peakTimeFor = (horizon) =>
  new Date(now + horizon * 36 * 60 * 1000)
    .toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export const getPredictiveKpis = (basinId = 'reconquista', horizon = 12) => {
  const basin = BASIN_BY_ID[basinId] ?? BASIN_BY_ID.reconquista;
  const base = mockPredictiveKPIs;
  const exceed = basin.zone === 'naranja' ? 78 : basin.zone === 'amarillo' ? 62 : 38;
  const forecastLevel = +(basin.level + horizon * 0.045).toFixed(2);
  const runoff = basin.zone === 'naranja' ? 265 : 210;
  const slopeRisk = basin.slopes;

  return [
    {
      ...base[0],
      label: `Prob. superación cota naranja (${horizon} h)`,
      value: exceed,
      status: exceed > 65 ? 'negative' : 'medium',
      spark: scale(base[0].spark, exceed / 62),
      subtext: `modelo Muskingum + ARIMA · ${basin.name}`,
    },
    {
      ...base[1],
      label: `Pronóstico nivel ${horizon} h`,
      value: forecastLevel,
      unit: 'm',
      status: basin.zone === 'normal' ? 'neutral' : 'negative',
      spark: scale(base[1].spark, forecastLevel / 7.05),
      subtext: `trayectoria hacia cota roja 7,40 m · ${basin.name}`,
    },
    {
      ...base[2],
      label: 'Hora pico estimada',
      value: peakTimeFor(horizon),
      spark: [],
      subtext: `ventana de confianza ±45 min · horizonte ${horizon} h`,
    },
    {
      ...base[3],
      label: 'Margen de error del modelo',
      value: 0.12,
      unit: 'm',
      change: -8,
      spark: [80, 76, 72, 68, 64, 60, 56, 48],
      subtext: 'MAPE 7,8% · validación cruzada',
    },
    {
      ...base[4],
      label: 'Escorrentía esperada',
      value: runoff,
      unit: 'mm',
      spark: scale(base[4].spark, runoff / 210),
      subtext: `${basin.name} · transformación lluvia-caudal`,
    },
    {
      ...base[5],
      label: 'Laderas con riesgo geotécnico',
      value: slopeRisk,
      unit: '',
      spark: scale(base[5].spark, slopeRisk / 14),
      subtext: `GEO-API ${basin.api}% · ${basin.name}`,
    },
  ];
};

const seriesLabels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const mockLevelSeries = seriesLabels.map((label, i) => ({
  timestamp: now - (seriesLabels.length - i) * 7 * day,
  value: [3.1, 3.4, 4.2, 4.6, 5.1, 5.3, 5.6, 5.9, 6.2, 6.1, 5.8, 6.4][i],
}));

export const getForecastSeries = (basinId = 'reconquista') => {
  const basin = BASIN_BY_ID[basinId] ?? BASIN_BY_ID.reconquista;
  const shape = [3.1, 3.4, 4.2, 4.6, 5.1, 5.3, 5.6, 5.9, 6.2, 6.1, 5.8, 6.4];
  const factor = basin.level / 6.42;
  return seriesLabels.map((label, i) => ({
    timestamp: now - (seriesLabels.length - i) * 7 * day,
    value: +(shape[i] * factor).toFixed(2),
  }));
};

const trendShape = [3.2, 3.6, 4.0, 4.4, 4.7, 5.0, 5.2, 5.4, 5.6, 5.8, 6.0, 6.2, 6.42];

export const getLevelTrend = (basinId = 'all', period = 'year') => {
  const basin = BASIN_BY_ID[basinId];
  const shape = basin ? trendShape.map((v) => +(v * (basin.level / 6.42)).toFixed(2)) : trendShape;
  const slices = { year: 13, quarter: 9, month: 5, '30d': 5 };
  const n = slices[period] ?? 13;
  return seq(n, (i, total) => ({
    label: `Sem ${13 - n + 1 + i}`,
    value: shape[i + (13 - n)],
    active: i === total - 1,
  }));
};

export const mockLevelTrend = getLevelTrend('all', 'year');

export const getStationSeries = (stationId = 'paso-castro', period = '30d') => {
  const station = STATION_BY_ID[stationId] ?? STATION_BY_ID['paso-castro'];

  if (period === '24h') {
    const n = 24;
    return seq(n, (i) => ({
      label: `h-${n - 1 - i}`,
      value: +(station.level - 0.7 + (i * 0.7) / (n - 1) + wave(i)).toFixed(1),
      active: i === n - 1,
    }));
  }

  const n = period === '7d' ? 7 : 30;
  return seq(n, (i) => ({
    label: `D-${n - 1 - i}`,
    value: +(station.level - 0.9 + (i * 0.9) / (n - 1) + wave(i, 1)).toFixed(1),
    active: i === n - 1,
  }));
};

export const mockLeaderboardGroups = [
  { rank: 1, name: 'Río Capacete', subtitle: 'Nivel 6,42 m · naranja', color: '#ef4444', delta: '+2' },
  { rank: 2, name: 'Río Luján', subtitle: 'Nivel 6,10 m · amarillo', color: '#f59e0b', delta: '+1' },
  { rank: 3, name: 'Río Reconquista', subtitle: 'Nivel 5,96 m · amarillo', color: '#f59e0b', delta: '-1' },
  { rank: 4, name: 'Río Salado', subtitle: 'Nivel 4,32 m · normal', color: '#1b59f8', delta: '0' },
  { rank: 5, name: 'Río Paraná', subtitle: 'Nivel 3,10 m · normal', color: '#22c55e', delta: '-2' },
];

export const mockLeaderboardUsers = [
  { rank: 1, name: 'Estación Santa Lucía', subtitle: 'ascenso 18 cm/h', avatar: 'SL', color: '#ef4444', delta: '+3', basin: 'lujan' },
  { rank: 2, name: 'Estación Paso Castro', subtitle: 'ascenso 12 cm/h', avatar: 'PC', color: '#f59e0b', delta: '+1', basin: 'reconquista' },
  { rank: 3, name: 'Estación Cuatro Bocas', subtitle: 'ascenso 8 cm/h', avatar: 'CB', color: '#f59e0b', delta: '0', basin: 'capacete' },
  { rank: 4, name: 'Estación El Progreso', subtitle: 'nivel estable', avatar: 'EP', color: '#1b59f8', delta: '-2', basin: 'salado' },
  { rank: 5, name: 'Estación La Picasa', subtitle: 'descenso 3 cm/h', avatar: 'LP', color: '#22c55e', delta: '-4', basin: 'salado' },
];

export const filterLeaderboard = (rows, basinId) => {
  if (!basinId || basinId === 'all') return rows;
  const basin = BASIN_BY_ID[basinId];
  if (!basin) return rows;
  return rows
    .filter((row) => (row.basin ? row.basin === basinId : row.name === basin.name))
    .map((row, idx) => ({ ...row, rank: idx + 1 }));
};

export const mockAlerts = [
  {
    id: 'a1',
    code: 'FLV-RISE-60',
    basin: 'capacete',
    title: 'Crecida súbita · Río Capacete',
    description: 'Velocidad de ascenso superó los 60 cm/h (FLV-RISE-60). Se activó la sirena comunitaria y la notificación a Defensa Civil.',
    severity: 'critical',
    status: 'active',
    timestamp: now - 5 * 60 * 1000,
    metric: 'wtr-lvl',
  },
  {
    id: 'a2',
    code: 'WTR-LVL-RED',
    basin: 'lujan',
    title: 'Nivel supera cota naranja · Río Luján',
    description: 'El limnímetro registró 6,10 m superando la cota naranja (6,5 m proyectado en 4 h).',
    severity: 'high',
    status: 'active',
    timestamp: now - 22 * 60 * 1000,
    metric: 'wtr-lvl',
  },
  {
    id: 'a3',
    code: 'PPT-INT-80',
    basin: 'reconquista',
    title: 'Precipitación intensa en la alta cuenca',
    description: 'Intensidad de lluvia > 50 mm/h en la estación Paso Castro (PPT-INT-50).',
    severity: 'medium',
    status: 'active',
    timestamp: now - 41 * 60 * 1000,
    metric: 'rain',
  },
  {
    id: 'a4',
    code: 'RES-CAP-90',
    basin: 'capacete',
    title: 'Embalse Capacete al 92%',
    description: 'Capacidad por encima del umbral RES-CAP-90. Apertura parcial de compuertas según protocolo operativo.',
    severity: 'medium',
    status: 'acknowledged',
    timestamp: now - 3 * 60 * 60 * 1000,
    metric: 'reservoir',
  },
  {
    id: 'a5',
    code: 'GEO-API-70',
    basin: 'salado',
    title: 'Índice API alto en laderas del Salado',
    description: 'Saturación de suelo en alerta (índice API 74%). Se monitorean laderas con riesgo geotécnico.',
    severity: 'low',
    status: 'resolved',
    timestamp: now - 8 * 60 * 60 * 1000,
    metric: 'geo',
  },
  {
    id: 'a6',
    code: 'WTR-LVL-AMB',
    basin: 'reconquista',
    title: 'Nivel en ascenso · Río Reconquista',
    description: 'El limnímetro registró 5,96 m y 12 cm/h de ascenso sostenido en la estación Paso Castro.',
    severity: 'high',
    status: 'active',
    timestamp: now - 12 * 60 * 1000,
    metric: 'wtr-lvl',
  },
  {
    id: 'a7',
    code: 'PPT-ACC-100',
    basin: 'lujan',
    title: 'Acumulado supera 100 mm · Río Luján',
    description: 'La lluvia acumulada en 24 h superó el umbral PPT-ACC-100 en la estación Santa Lucía.',
    severity: 'medium',
    status: 'acknowledged',
    timestamp: now - 95 * 60 * 1000,
    metric: 'rain',
  },
  {
    id: 'a8',
    code: 'FLV-RISE-60',
    basin: 'capacete',
    title: 'Crecida súbita · Cuatro Bocas',
    description: 'Ascenso de 8 cm/h con proyección a superar la cota amarilla dentro de 12 h.',
    severity: 'low',
    status: 'resolved',
    timestamp: now - 26 * 60 * 60 * 1000,
    metric: 'wtr-lvl',
  },
];

export const mockDispatchSummary = {
  sirensActive: 2,
  confirmationRate: 61,
  evacuatedZones: 4,
  bodies: ['Defensa Civil', 'Bomberos Voluntarios', 'Gestores de Cuenca'],
  leadTime: '2 h 40 min',
};

export const mockNotificationCount = 4;

export const OPERATIONAL_PERIOD_OPTIONS = [
  { key: '3h', label: 'Últimas 3 horas' },
  { key: '24h', label: 'Últimas 24 horas' },
  { key: 'event', label: 'Evento en curso' },
];

export const OPERATIONAL_PERIOD_CHANGE_LABEL = {
  '3h': 'ventana operativa',
  '24h': 'ventana operativa',
  event: 'evento activo',
};

export const PERIOD_SELECT_OPTIONS = [
  { key: 'year', label: 'Este año' },
  { key: 'quarter', label: 'Último trimestre' },
  { key: 'month', label: 'Este mes' },
  { key: '30d', label: 'Últimos 30 días' },
];

export const PERIOD_CHANGE_LABEL = {
  year: 'vs ayer',
  quarter: 'vs trimestre anterior',
  month: 'vs mes anterior',
  '30d': 'vs últimos 30 días',
};
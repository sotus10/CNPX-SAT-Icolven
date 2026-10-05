/**
 * Transformaciones que convierten filas de la API en series para Recharts.
 *
 * Se mantienen fuera de los componentes para que las gráficas 4 a 8 compartan
 * el mismo criterio de tiempo, de orden y de manejo de valores ausentes.
 */

/** PostgREST devuelve los NUMERIC como texto; se normalizan aquí. */
export const toNum = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
};

/** Etiqueta de hora para los ejes de las gráficas de barras: "15:00". */
export const hourLabel = (value) => {
  if (typeof value !== 'string') return '';
  return value.slice(11, 16) || '';
};

/** Periodos que ofrecen los selectores de histórico de las páginas. */
export const PERIOD_OPTIONS = [
  { key: 24, label: 'Últimas 24 horas' },
  { key: 48, label: 'Últimas 48 horas' },
];

export const periodLabel = (period) =>
  PERIOD_OPTIONS.find((opcion) => opcion.key === period)?.label ?? PERIOD_OPTIONS[0].label;

const toTime = (value) => {
  const fecha = Date.parse(value);
  return Number.isNaN(fecha) ? null : fecha;
};

/**
 * Hora local del sensor en la zona horaria del satélite.
 *
 * Open-Meteo devuelve horas locales sin desfase ("2026-09-23T15:00") mientras que
 * Supabase devuelve marcas UTC. Sin convertir, las dos series quedarían desalineadas.
 */
const hourKeyEnZona = (value, zona) => {
  const momento = toTime(value);
  if (momento === null) return null;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(momento));
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  // Con hour12:false algunas versiones devuelven "24" para medianoche.
  const hora = valor('hour') === '24' ? '00' : valor('hour');
  return `${valor('year')}-${valor('month')}-${valor('day')}T${hora}`;
};

const ascending = (a, b) => (toTime(a.timestamp) ?? 0) - (toTime(b.timestamp) ?? 0);

const takeLast = (rows, limit) => rows.slice(Math.max(0, rows.length - limit));

/**
 * Gráfica 4 — río contra lluvia sobre una línea de tiempo común.
 *
 * Se usa la unión de las horas de ambos orígenes: las horas de lluvia sin
 * lectura del sensor son justamente las que evidencia el retardo hidrológico.
 */
export const buildHydroSeries = (satellite, cleanReadings, limit = 24) => {
  const zona = satellite?.timezone || 'America/Bogota';

  const lluviaPorHora = new Map();
  (satellite?.hourly ?? [])
    .filter((punto) => !punto.is_forecast)
    .forEach((punto) => {
      const clave = typeof punto.time === 'string' ? punto.time.slice(0, 13) : null;
      const valor = toNum(punto.precipitation_mm);
      if (clave && valor !== null) lluviaPorHora.set(clave, valor);
    });

  const sensorPorHora = new Map();
  (cleanReadings ?? []).forEach((lectura) => {
    const clave = hourKeyEnZona(lectura.timestamp, zona);
    const valor = toNum(lectura.distancia_cm);
    if (clave && valor !== null && !sensorPorHora.has(clave)) {
      sensorPorHora.set(clave, valor);
    }
  });

  const horas = takeLast(
    [...new Set([...lluviaPorHora.keys(), ...sensorPorHora.keys()])].sort(),
    limit
  );

  const puntos = horas.map((clave) => ({
    clave,
    label: `${clave.slice(11)}:00`,
    distancia_cm: sensorPorHora.get(clave) ?? null,
    precipitacion: lluviaPorHora.get(clave) ?? null,
  }));

  return { puntos, lag: calcularLag(puntos) };
};

/**
 * Horas entre el primer registro de lluvia y el momento en que el cauce supera
 * el nivel previo, es decir, cuando el agua empieza a subir.
 *
 * Menor `distancia_cm` significa más agua, así que la subida se detecta cuando
 * la distancia crece por encima del máximo anterior a la lluvia.
 */
const calcularLag = (puntos) => {
  const inicioLluvia = puntos.findIndex((punto) => (punto.precipitacion ?? 0) > 0);
  if (inicioLluvia < 0) return null;

  const previas = puntos
    .slice(0, inicioLluvia)
    .map((punto) => punto.distancia_cm)
    .filter((valor) => valor !== null);
  if (!previas.length) return null;

  const nivelPrevio = Math.max(...previas);
  for (let i = inicioLluvia; i < puntos.length; i += 1) {
    const distancia = puntos[i].distancia_cm;
    if (distancia !== null && distancia > nivelPrevio) {
      return {
        horas: i - inicioLluvia,
        inicioLluvia: puntos[inicioLluvia].label,
        respuesta: puntos[i].label,
      };
    }
  }
  return null;
};

/**
 * Gráfica 5 — crudo contra limpio.
 *
 * Cada lectura cruda se inserta antes de validarse, y solo las válidas descienden
 * a `lecturas_limpias`, enlazadas por `lectura_cruda_id`. Una cruda sin
 * contraparte limpia es, por tanto, una lectura descartada por el filtro.
 */
export const buildAuditSeries = (rawReadings, cleanReadings, limit = 60) => {
  const limpiaPorCruda = new Map();
  (cleanReadings ?? []).forEach((lectura) => {
    if (lectura.lectura_cruda_id) {
      limpiaPorCruda.set(lectura.lectura_cruda_id, lectura);
    }
  });

  const ordenadas = takeLast([...(rawReadings ?? [])].sort(ascending), limit);
  // La ventana limpia consultada empieza en su lectura más antigua y avanza hacia
  // el presente. Solo una cruda dentro de esa ventana puede declararse
  // descartada: si fuera más vieja, su contraparte limpia pudo quedar fuera del
  // recorte y el descarte sería una conclusión sin respaldo.
  const masAntiguaLimpia = (cleanReadings ?? []).reduce(
    (minimo, lectura) => {
      const momento = toTime(lectura.timestamp);
      return momento === null ? minimo : minimo === null || momento < minimo ? momento : minimo;
    },
    null
  );

  const puntos = ordenadas.map((lectura) => {
    const limpia = limpiaPorCruda.get(lectura.id);
    const momento = toTime(lectura.timestamp);
    return {
      label: horaDeDia(lectura.timestamp),
      timestamp: lectura.timestamp,
      cruda: toNum(lectura.distancia_cm),
      limpia: limpia ? toNum(limpia.distancia_cm) : null,
      nivel: limpia?.nivel ?? null,
      descartada: !limpia,
      verificable: Boolean(limpia) || (momento !== null && masAntiguaLimpia !== null && momento >= masAntiguaLimpia),
    };
  });

  const verificables = puntos.filter((punto) => punto.verificable);
  const descartadas = verificables.filter((punto) => punto.descartada).length;
  const conservadas = verificables.length - descartadas;

  return {
    puntos,
    resumen: {
      crudas: puntos.length,
      verificables: verificables.length,
      conservadas,
      descartadas,
      tasaDescarte: verificables.length ? Math.round((descartadas / verificables.length) * 100) : null,
    },
  };
};

/**
 * Gráfica 6 — reparto de alertas según confirmación satelital.
 *
 * Los sectores se filtran cuando valen cero para que el anillo no dibuje un
 * hueco vacío; `total` sigue siendo el número real de alertas registradas.
 */
export const buildAlertConfirmation = (alerts = []) => {
  const confirmadas = alerts.filter((alerta) => alerta.confirmada_por_satelite).length;
  return [
    { id: 'confirmadas', name: 'Confirmadas por satélite', value: confirmadas, tone: '#16a34a' },
    { id: 'sin-confirmar', name: 'Sin confirmación satelital', value: alerts.length - confirmadas, tone: '#f59e0b' },
  ].filter((sector) => sector.value > 0);
};

/** Gráfica 8 — notificaciones por canal y estado de envío. */
export const buildNotificationSeries = (notifications = []) => {
  const porCanal = new Map();

  (notifications ?? []).forEach((notificacion) => {
    const canal = String(notificacion.canal ?? 'sin canal').trim().toUpperCase();
    const estado = String(notificacion.estado_envio ?? 'desconocido').trim().toLowerCase();
    if (!porCanal.has(canal)) {
      const fila = { canal, total: 0 };
      ESTADOS_ENVIO.forEach(({ clave }) => {
        fila[clave] = 0;
      });
      porCanal.set(canal, fila);
    }
    const fila = porCanal.get(canal);
    fila.total += 1;
    if (fila[estado] === undefined) fila[estado] = 0;
    fila[estado] += 1;
  });

  const filas = [...porCanal.values()].sort((a, b) => a.canal.localeCompare(b.canal));
  const resumen = { total: 0 };
  ESTADOS_ENVIO.forEach(({ clave }) => {
    resumen[clave] = filas.reduce((suma, fila) => suma + fila[clave], 0);
  });
  filas.forEach((fila) => {
    resumen.total += fila.total;
  });

  return { filas, resumen };
};

/** Colores y orden de los estados de envío reconocidos por la especificación. */
export const ESTADOS_ENVIO = [
  { clave: 'enviado', label: 'Enviado', tone: '#16a34a' },
  { clave: 'fallido', label: 'Fallido', tone: '#dc2626' },
  { clave: 'pendiente', label: 'Pendiente', tone: '#f59e0b' },
];

/** Gráfica 7 — estado de conectividad con el tiempo transcurrido. */
export const buildNodeConnectivity = (nodes = []) =>
  (nodes ?? []).map((nodo) => ({
    id: nodo.id,
    nombre: nodo.nombre ?? nodo.nodo_codigo ?? 'Nodo sin nombre',
    ubicacion: nodo.ubicacion,
    conectividad: nodo.conectividad,
    minutosSinLectura: toNum(nodo.minutos_sin_lectura),
    ultimaLectura: nodo.ultima_lectura,
    detalle: nodo.detalle,
    distanciaCm: toNum(nodo.distancia_cm),
    velocidadCmMin: toNum(nodo.velocidad_cm_min),
  }));

const horaDeDia = (value) => {
  const momento = toTime(value);
  if (momento === null) return '';
  return new Date(momento).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

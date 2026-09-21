export const PROJECT_NAME = "Cauce";
export const COMPETITION = "Maratón Nacional de Programación · Colombia";

export const NAV_LINKS = [
  { label: "Problema", href: "#problema" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Tecnología", href: "#tecnologia" },
  { label: "Equipo", href: "#equipo" },
];

export const STATS = [
  { value: 10, prefix: "+", suffix: " km", caption: "alcance del enlace LoRa sin infraestructura" },
  { value: 10, suffix: " min", caption: "intervalo de medición del nivel del río" },
  { value: 0, suffix: " $", caption: "costo de conectividad mensual por nodo" },
  { value: 24, suffix: "/7", caption: "operación autónoma con energía solar" },
];

export const PROBLEM_CARDS = [
  { figure: "[DATO]", label: "municipios ribereños sin instrumentación", source: "fuente: DANE / UNGRD" },
  { figure: "[DATO]", label: "familias afectadas por crecientes súbitas al año", source: "fuente: UNGRD" },
  { figure: "[DATO]", label: "minutos de anticipación promedio hoy", source: "fuente: IDEAM" },
];

export const STEPS = [
  {
    n: "01",
    title: "Medición",
    text: "Un sensor ultrasónico sobre el río toma el nivel del agua cada diez minutos.",
  },
  {
    n: "02",
    title: "Transmisión",
    text: "El dato viaja por radio LoRa a 900 MHz. No necesita cobertura celular.",
  },
  {
    n: "03",
    title: "Validación",
    text: "El nodo receptor contrasta la lectura con datos satelitales de lluvia antes de escalar.",
  },
  {
    n: "04",
    title: "Alerta",
    text: "Suena la sirena en el parque. Primero avisa a los líderes, luego a cada habitante.",
  },
];

export type AlertLevel = {
  key: "verde" | "amarillo" | "naranja" | "rojo";
  name: string;
  condition: string;
  notify: string;
  threshold: number;
};

export const ALERT_LEVELS: AlertLevel[] = [
  { key: "verde", name: "Verde", condition: "Nivel dentro del rango habitual.", notify: "Nadie. El sistema registra en silencio.", threshold: 1.2 },
  { key: "amarillo", name: "Amarillo", condition: "El nivel sube de forma sostenida durante una hora.", notify: "Líderes comunitarios y alcaldía.", threshold: 1.9 },
  { key: "naranja", name: "Naranja", condition: "El nivel supera la cota de desborde en zonas bajas.", notify: "Líderes, alcaldía y habitantes de la ribera.", threshold: 2.4 },
  { key: "rojo", name: "Rojo", condition: "Desborde inminente confirmado con lluvia satelital.", notify: "Sirena en el parque y todos los teléfonos del municipio.", threshold: 2.9 },
];

export const NODE_STATUS = [
  { label: "nodo", value: "activo" },
  { label: "batería", value: "87 %" },
  { label: "RSSI", value: "−96 dBm" },
  { label: "última lectura", value: "hace 4 min" },
];

/** 48 lecturas (24 h cada 30 min): subida gradual que cruza el umbral amarillo al final. */
export const RIVER_SERIES: { time: string; level: number; rain: number }[] = Array.from(
  { length: 48 },
  (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const t = i / 47;
    const base = 1.05 + 0.12 * Math.sin(i * 0.55) * (1 - t);
    const rise = t < 0.55 ? 0 : Math.pow((t - 0.55) / 0.45, 1.6) * 1.05;
    const level = Number((base + rise).toFixed(2));
    const rainCore = t < 0.45 ? 0.2 : Math.max(0, 9 * Math.sin((t - 0.45) * 4.2)) + 1.5;
    const rain = Number((rainCore + Math.abs(Math.sin(i * 1.7)) * 1.4).toFixed(1));
    return { time: `${String(h).padStart(2, "0")}:${m}`, level, rain };
  },
);

export const NODES = [
  { id: "N-01", name: "Nodo Puente Viejo", type: "transmisor", battery: 87, spark: [1.1, 1.12, 1.1, 1.15, 1.2, 1.3, 1.45, 1.7, 1.9] },
  { id: "N-02", name: "Nodo Bocatoma", type: "transmisor", battery: 92, spark: [0.9, 0.92, 0.91, 0.95, 0.98, 1.05, 1.1, 1.2, 1.28] },
  { id: "R-01", name: "Receptor Parque", type: "receptor", battery: 100, spark: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
];

export const TECH = [
  {
    key: "lora",
    title: "LoRa 900 MHz",
    text: "Radio de largo alcance en banda libre. Kilómetros de cobertura con miliwatts de potencia.",
    spec: "SF7–SF12 · 915 MHz · −137 dBm",
    large: true,
  },
  { key: "esp32", title: "ESP32", text: "Microcontrolador de bajo consumo con radio integrada y modo de sueño profundo.", spec: "240 MHz · deep sleep 10 µA" },
  { key: "sensor", title: "Sensor ultrasónico", text: "Mide la distancia al agua sin contacto. No se corroe ni se atasca con sedimento.", spec: "JSN-SR04T · ±1 cm · 20–600 cm" },
  { key: "solar", title: "Energía solar autónoma", text: "Panel de 6 W y batería LiFePO4 para semanas de operación sin sol directo.", spec: "6 W · 3.2 V · 6000 mAh" },
  { key: "sat", title: "Validación satelital", text: "Datos abiertos de precipitación para confirmar cada escalamiento de nivel.", spec: "GPM IMERG · 30 min · gratuito" },
  { key: "ip68", title: "Carcasas IP68", text: "Sellado contra lluvia, polvo e inmersión temporal. Pensado para el trópico.", spec: "IP68 · UV · −20 a 60 °C" },
];

export const TEAM = [
  { name: "Juan Diego Soto", role: "Arquitectura y firmware", github: "#", linkedin: "#" },
  { name: "María Camila Ruiz", role: "Datos y validación satelital", github: "#", linkedin: "#" },
  { name: "Andrés Felipe Gómez", role: "Hardware y energía", github: "#", linkedin: "#" },
  { name: "Laura Valentina Mesa", role: "Comunidad y territorio", github: "#", linkedin: "#" },
];

export const STORY_STEPS = [
  {
    from: 0,
    to: 0.16,
    kicker: "01 · Medición",
    title: "Sobre el río, un nodo escucha.",
    text: "Un sensor ultrasónico mide la distancia al agua cada diez minutos. Un panel solar lo mantiene despierto.",
  },
  {
    from: 0.16,
    to: 0.38,
    kicker: "02 · Conexión LoRa",
    title: "La lectura viaja por radio.",
    text: "A 900 MHz, sin torres ni antenas celulares, el dato recorre kilómetros de monte hasta el pueblo.",
  },
  {
    from: 0.38,
    to: 0.56,
    kicker: "03 · Recepción",
    title: "El poste del parque recibe.",
    text: "El nodo receptor toma la trama, la valida y la contrasta con la lluvia satelital.",
  },
  {
    from: 0.56,
    to: 0.72,
    kicker: "04 · Enlace WiFi",
    title: "Datos enviados a la base de datos.",
    text: "Por la red WiFi de la alcaldía, cada lectura queda guardada con hora, nivel y estado.",
  },
  {
    from: 0.72,
    to: 1,
    kicker: "05 · Dashboard",
    title: "Todo el río en una pantalla.",
    text: "Quien vigila ve el nivel, la tendencia y el umbral que se acerca. Antes de que sea tarde.",
  },
];

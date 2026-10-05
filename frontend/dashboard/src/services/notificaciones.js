import { api } from './api';

const urlBase64AB64 = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalizada = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binario = window.atob(normalizada);
  return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
};

const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const estadoPermiso = () => {
  if (!supported()) return 'no-soportado';
  return Notification.permission;
};

export const registrarServiceWorker = async () => {
  if (!supported()) throw new Error('Este navegador no soporta notificaciones push');
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
};

const pedirSuscripcion = async (clavePublica) => {
  const registro = await registrarServiceWorker();
  await navigator.serviceWorker.ready;
  const existente = await registro.pushManager.getSubscription();
  if (existente) return existente;
  return registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64AB64(clavePublica),
  });
};

export const suscribir = async (etiqueta) => {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    return { Suscrito: false, motivo: `Permiso ${permiso}` };
  }

  const { data } = await api.get('/notificaciones/vapid');
  const suscripcion = await pedirSuscripcion(data.clave_publica);

  await api.post('/notificaciones/suscripcion', {
    suscripcion: suscripcion.toJSON(),
    clave_publica: data.clave_publica,
    etiqueta,
  });

  return { suscrito: true, id: suscripcion.endpoint };
};

export const desuscribir = async () => {
  const registro = await registrarServiceWorker();
  const suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) return { suscrito: false };

  await api.delete('/notificaciones/suscripcion', {
    suscripcion: suscripcion.toJSON(),
  });
  await suscripcion.unsubscribe();
  return { suscrito: false };
};

export const haySuscripcionActiva = async () => {
  if (!supported()) return false;
  const registro = await navigator.serviceWorker.getRegistration('/');
  if (!registro) return false;
  return Boolean(await registro.pushManager.getSubscription());
};

/*
 * Service worker del SAT: recibe las alertas de inundación por Web Push.
 *
 * La clave de cifrado (p256dh) nunca sale del dispositivo: el service worker solo
 * la usa para descifrar el mensaje que el push service le entrega ya cifrado.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('push', (evento) => {
  let carga = {};
  try {
    carga = evento.data ? evento.data.json() : {};
  } catch {
    carga = { cuerpo: evento.data ? evento.data.text() : '' };
  }

  const titulo = carga.titulo || 'Alerta de inundación';
  const opciones = {
    body: carga.cuerpo || 'El nivel del río subió. Revisa el dashboard.',
    icon: '/icono-192.png',
    badge: '/icono-96.png',
    tag: carga.data?.alerta_id ? `alerta-${carga.data.alerta_id}` : 'alerta-sat',
    data: { url: carga.data?.url || '/#/alerts' },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  };

  evento.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url || '/#/alerts';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si el dashboard ya está abierto se enfoca en vez de abrir otra pestaña.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.navigate(destino);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});

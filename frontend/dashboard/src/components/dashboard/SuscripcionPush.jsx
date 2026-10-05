import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { desuscribir, estadoPermiso, haySuscripcionActiva, suscribir } from '../../services/notificaciones';

/**
 * Activa el aviso al celular. El navegador exige un gesto del usuario, así que
 * el botón es explícito y nunca se suscribe al cargar la página.
 */
const SuscripcionPush = () => {
  const [soporte, setSoporte] = useState('desconocido');
  const [suscrito, setSuscrito] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSoporte(estadoPermiso());
    haySuscripcionActiva()
      .then(setSuscrito)
      .catch(() => setSuscrito(false));
  }, []);

  const activar = useCallback(async () => {
    setOcupado(true);
    setError(null);
    try {
      const resultado = await suscribir('dashboard-web');
      setSuscrito(resultado.suscrito === true);
      setSoporte(estadoPermiso());
    } catch (fallo) {
      setError(fallo.response?.data?.detail ?? fallo.message);
    } finally {
      setOcupado(false);
    }
  }, []);

  const apagar = useCallback(async () => {
    setOcupado(true);
    setError(null);
    try {
      await desuscribir();
      setSuscrito(false);
    } catch (fallo) {
      setError(fallo.response?.data?.detail ?? fallo.message);
    } finally {
      setOcupado(false);
    }
  }, []);

  if (soporte === 'no-soportado') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-4 flex items-start gap-3">
        <span className="h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-800">
          <Smartphone size={17} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-carbon dark:text-slate-100">
            Aviso al celular no disponible
          </p>
          <p className="text-[12px] text-[#a6a6a6]">
            Este navegador no soporta Web Push. Prueba desde Chrome o Safari en el celular.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-4">
      <div className="flex items-start gap-3">
        <span
          className="h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: suscrito ? '#1b59f814' : '#ea580c14', color: suscrito ? '#1b59f8' : '#ea580c' }}
        >
          {suscrito ? <Bell size={17} /> : <BellOff size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-carbon dark:text-slate-100">
            {suscrito ? 'Avisos al celular activos' : 'Recibir avisos de inundación en el celular'}
          </p>
          <p className="text-[12px] text-[#a6a6a6] mt-0.5">
            {suscrito
              ? 'Este dispositivo está suscrito. Recibirás un aviso cuando el sensor marque nivel alto o crítico.'
              : 'Suscríbete para recibir un aviso en cuanto el sensor detecte una crecida, sin importar si la app está abierta.'}
          </p>
          {soporte === 'denied' && (
            <p className="text-[12px] text-[#dc2626] mt-1">
              El navegador tiene bloqueadas las notificaciones. Habilítalas desde los ajustes del sitio.
            </p>
          )}
          {error && <p className="text-[12px] text-[#dc2626] mt-1">{error}</p>}
        </div>
        <button
          type="button"
          onClick={suscrito ? apagar : activar}
          disabled={ocupado || soporte === 'denied'}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: suscrito ? '#64748b' : '#1b59f8' }}
        >
          {ocupado && <Loader2 size={13} className="animate-spin" />}
          {suscrito ? 'Desactivar' : 'Activar avisos'}
        </button>
      </div>
    </div>
  );
};

export default SuscripcionPush;

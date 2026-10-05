import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import {
  fetchEstadoWhatsapp,
  fetchMiContactoWhatsapp,
  guardarMiContactoWhatsapp,
  revocarMiContactoWhatsapp,
} from '../../services/api';

const NIVELES = [
  { clave: 'AMARILLO', etiqueta: 'Amarillo', ayuda: 'vigilancia', tono: '#d97706' },
  { clave: 'NARANJA', etiqueta: 'Naranja', ayuda: 'prevención', tono: '#ea580c' },
  { clave: 'ROJO', etiqueta: 'Rojo', ayuda: 'evacuación', tono: '#dc2626' },
];

// Mismo criterio que backend/contactos.py: sin código de país no se adivina,
// porque un número mal interpretado manda la alerta a otro país.
const normalizar = (valor) => {
  const limpio = valor.replace(/[^\d+]/g, '');
  if (!limpio) return '';
  if (limpio.startsWith('+')) return `+${limpio.slice(1).replace(/\D/g, '')}`;
  if (/^57\d{10,}$/.test(limpio)) return `+${limpio}`;
  return null;
};

const esValido = (telefono) => typeof telefono === 'string' && /^\+[1-9]\d{6,14}$/.test(telefono);

// No hay autenticación en el dashboard, así que nada identifica "mi" número.
// Se guarda una referencia local para poder restaurar el formulario al recargar.
// Es solo un puntero al número que el propio operador escribió en este equipo.
const CLAVE_LOCAL = 'sat.whatsapp.telefono';

const leerTelefonoGuardado = () => {
  try {
    return window.localStorage.getItem(CLAVE_LOCAL) || '';
  } catch {
    return '';
  }
};

const recordarTelefono = (telefono) => {
  try {
    if (telefono) window.localStorage.setItem(CLAVE_LOCAL, telefono);
    else window.localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    // Modo privado o cuota llena: el formulario igual funciona en esta sesion.
  }
};

const MiWhatsapp = () => {
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [niveles, setNiveles] = useState(['AMARILLO', 'NARANJA', 'ROJO']);
  const [acepta, setAcepta] = useState(false);
  const [estadoCanal, setEstadoCanal] = useState(null);
  const [registrado, setRegistrado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const normalizado = useMemo(() => normalizar(telefono), [telefono]);
  const errorTelefono = useMemo(() => {
    if (!telefono.trim()) return null;
    if (normalizado === null) return 'Falta el código de país. Usa formato +573001234567.';
    if (!esValido(normalizado)) return 'Ese número no tiene la longitud de un móvil válido.';
    return null;
  }, [telefono, normalizado]);

  useEffect(() => {
    fetchEstadoWhatsapp().then(setEstadoCanal).catch(() => setEstadoCanal(null));

    const guardado = leerTelefonoGuardado();
    if (esValido(guardado)) {
      setTelefono(guardado);
      consultar(guardado);
    }
  }, []);

  const consultar = async (numero) => {
    try {
      const respuesta = await fetchMiContactoWhatsapp(numero);
      setRegistrado(respuesta.registrado ? respuesta.data : null);
      setError(null);
      if (respuesta.registrado && respuesta.data.niveles) {
        setNiveles(respuesta.data.niveles);
      }
    } catch (fallo) {
      // Sin esto, si falta el esquema la pagina cargaria en silencio y el
      // operador creeria que su numero quedo guardado.
      setRegistrado(null);
      setError(fallo.message);
    }
  };

  const alternarNivel = (clave) => {
    setNiveles((previos) =>
      previos.includes(clave) ? previos.filter((n) => n !== clave) : [...previos, clave]
    );
  };

  const guardar = async () => {
    setOcupado(true);
    setError(null);
    setExito(null);
    try {
      const respuesta = await guardarMiContactoWhatsapp({
        telefono: normalizado,
        nombre: nombre.trim() || 'Operador SAT',
        consentimiento: 'otorgado',
        metodo_consentimiento: 'configuracion-perfil',
        texto_consentimiento:
          'Autorizo recibir alertas de inundación de Icolven por WhatsApp en este número.',
        niveles,
        tipo_destinatario: 'operador',
      });
      setTelefono(respuesta.telefono);
      recordarTelefono(respuesta.telefono);
      await consultar(respuesta.telefono);
      setExito(
        respuesta.actualizado
          ? 'Número actualizado. Quedará suscrito a los niveles marcados.'
          : 'Número registrado. Quedará suscrito a los niveles marcados.'
      );
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setOcupado(false);
    }
  };

  const revocar = async () => {
    setOcupado(true);
    setError(null);
    setExito(null);
    try {
      await revocarMiContactoWhatsapp(normalizado);
      setRegistrado(null);
      setExito('Consentimiento revocado. Este número ya no recibirá alertas.');
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setOcupado(false);
    }
  };

  const esquemaAusente = estadoCanal?.puede_guardar_numero === false;
  const puedeGuardar =
    esValido(normalizado) && niveles.length > 0 && acepta && !ocupado && !esquemaAusente;

  return (
    <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 xl:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle size={16} className="text-primary" />
        <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Mi número de WhatsApp</h2>
      </div>
      <p className="text-[12px] text-[#a6a6a6] mb-4">
        Las alertas de este perfil se envían a este número por WhatsApp.
      </p>

      {estadoCanal && estadoCanal.puede_guardar_numero === false && (
        <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-[#dc2626]" />
          <div className="text-[12px] text-[#991b1b]">
            <p className="font-semibold">No se puede guardar el número todavía.</p>
            <p className="mt-0.5">{estadoCanal.detalle}</p>
            <p className="mt-1">
              Hasta que se aplique ese SQL, ningún número queda registrado y por lo tanto
              ninguna alerta puede enviarse.
            </p>
          </div>
        </div>
      )}

      {estadoCanal && estadoCanal.puede_guardar_numero !== false && !estadoCanal.listo_para_enviar && (
        <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#ea580c]" />
          <div className="text-[12px] text-[#9a3412]">
            <p className="font-semibold">El número se guardará, pero todavía no puede recibir avisos.</p>
            <p className="mt-0.5">{estadoCanal.detalle}</p>
            <p className="mt-1 text-[#c2410c]">
              Mientras tanto el canal corre en modo simulación: los envíos quedan registrados para
              medir la efectividad, pero no llegan a ningún celular.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wa-telefono" className="block text-[13px] font-semibold text-carbon dark:text-slate-100">
            Número de WhatsApp
          </label>
          <input
            id="wa-telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+573001234567"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={`mt-1.5 w-full rounded-[10px] border bg-canvas dark:bg-slate-800 px-3.5 py-2.5 text-[13px] text-carbon dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30 ${
              errorTelefono ? 'border-[#dc2626]' : 'border-line dark:border-slate-700'
            }`}
          />
          {errorTelefono ? (
            <p className="mt-1 text-[12px] text-[#dc2626]">{errorTelefono}</p>
          ) : (
            <p className="mt-1 text-[12px] text-[#a6a6a6]">
              Incluye el código de país. El número se guarda cifrado en tránsito y solo se usa
              para enviarte alertas.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="wa-nombre" className="block text-[13px] font-semibold text-carbon dark:text-slate-100">
            Nombre del responsable
          </label>
          <input
            id="wa-nombre"
            type="text"
            placeholder="Operador SAT"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-line dark:border-slate-700 bg-canvas dark:bg-slate-800 px-3.5 py-2.5 text-[13px] text-carbon dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-[12px] text-[#a6a6a6]">
            Opcional. Aparece en la auditoría de a quién se le avisó.
          </p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[13px] font-semibold text-carbon dark:text-slate-100">
          Niveles que quieres recibir
        </legend>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {NIVELES.map(({ clave, etiqueta, ayuda, tono }) => {
            const activo = niveles.includes(clave);
            return (
              <button
                key={clave}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarNivel(clave)}
                className={`rounded-[10px] border px-3 py-2 text-left transition-colors ${
                  activo ? 'border-transparent' : 'border-line dark:border-slate-700'
                }`}
                style={activo ? { backgroundColor: `${tono}14`, borderColor: `${tono}55` } : undefined}
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tono }} />
                  <span className="text-[13px] font-semibold text-carbon dark:text-slate-100">
                    {etiqueta}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-[#a6a6a6]">{ayuda}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#1b59f8]"
        />
        <span className="text-[12px] text-[#4b5563] dark:text-slate-300">
          Autorizo recibir en este número las alertas de inundación de Icolven. Puedo revocar
          este consentimiento cuando quiera y dejaré de recibir mensajes. Este dato se trata
          conforme a la Ley 1581 de 2012.
        </span>
      </label>

      {registrado && (
        <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-line dark:border-slate-700 bg-canvas dark:bg-slate-800 px-4 py-3 text-[12px] text-carbon dark:text-slate-200">
          <Smartphone size={14} className="shrink-0 text-primary" />
          <span>
            Este número está{' '}
            <strong>{registrado.consentimiento === 'otorgado' ? 'suscrito' : registrado.consentimiento}</strong>
            {` · recibe: ${(registrado.niveles || []).join(', ') || 'ningún nivel'}`}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#991b1b]">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {exito && (
        <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12px] font-semibold text-[#15803d]">
          <CheckCircle2 size={14} />
          {exito}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={!puedeGuardar}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {ocupado && <Loader2 size={14} className="animate-spin" />}
          Guardar y Suscribirme
        </button>
        {registrado?.consentimiento === 'otorgado' && (
          <button
            type="button"
            onClick={revocar}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-[10px] border border-line dark:border-slate-700 px-4 py-2 text-[13px] font-semibold text-[#4b5563] dark:text-slate-300 hover:bg-canvas dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            Revocar consentimiento
          </button>
        )}
        {!acepta && telefono.trim() && !esquemaAusente && (
          <span className="text-[12px] text-[#a6a6a6]">Marca la casilla de autorización para guardar.</span>
        )}
      </div>
    </section>
  );
};

export default MiWhatsapp;

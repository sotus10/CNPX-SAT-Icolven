import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Bell, LogOut } from 'lucide-react';
import { logout } from '../../store/slices/userSlice';
import { ThemeToggle } from '../common/ThemeToggle';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const unreadCount = useSelector((state) => state.alerts.unreadCount);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setUpdatedAt(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const timestamp = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(updatedAt);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-line dark:border-slate-800 flex items-center gap-4 px-6 transition-colors">
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#808080] dark:text-slate-400"
        />
        <input
          type="text"
          placeholder="Buscar cuencas, estaciones, alertas..."
          className="w-full rounded-[10px] bg-canvas dark:bg-slate-800 border border-line dark:border-slate-700 pl-10 pr-4 py-2 text-[13px] text-carbon dark:text-slate-100 placeholder-[#a6a6a6] dark:placeholder-slate-400 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div
          className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-[#4d4d4d] dark:text-slate-300"
          aria-live="polite"
        >
          <span className="text-[#16a34a]" aria-hidden="true">●</span>
          <span>Telemetría en vivo</span>
          <span className="text-[#a6a6a6] dark:text-slate-500">|</span>
          <span>Actualizado: {timestamp}</span>
        </div>

        {/* modo oscuro blanco*/}
        <ThemeToggle />

        {/* Botón de Alertas */}
        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="relative h-10 w-10 rounded-[10px] border border-line dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-[#4d4d4d] dark:text-slate-200 hover:border-primary/40 hover:text-primary transition-colors"
          aria-label="Alertas"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#ff5252] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Botón Salir */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 h-10 px-3 rounded-[10px] border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#4d4d4d] dark:text-slate-200 hover:text-[#ff5252] hover:border-[#ff5252]/40 transition-colors"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  );
};

export default Header;
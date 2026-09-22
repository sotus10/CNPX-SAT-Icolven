import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Waves,
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  Droplets,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Estado General de Cuencas', icon: LayoutDashboard },
  { path: '/hydrology', label: 'Hidrología y Pluviometría', icon: Waves },
  { path: '/alerts', label: 'Alertas y Emergencias', icon: AlertTriangle },
  { path: '/predictive', label: 'Predictivo y Geotecnia', icon: Activity },
  { path: '/reports', label: 'Reportes', icon: FileText },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <aside className="w-[212px] shrink-0 h-full bg-white dark:bg-slate-900 border-r border-line dark:border-slate-800 flex flex-col transition-colors">
      <div className="px-5 pt-6 pb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Droplets size={18} className="text-white" />
        </div>
        <span className="font-bold text-[18px] tracking-tight text-carbon dark:text-slate-100">
          CNP Cuencas
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400'
                  : 'text-[#4d4d4d] dark:text-slate-400 hover:bg-[#f2f2f7] dark:hover:bg-slate-800 hover:text-carbon dark:hover:text-slate-100'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-card bg-canvas dark:bg-slate-800 border border-line dark:border-slate-700 flex items-center gap-3 transition-colors">
        <div className="h-9 w-9 rounded-full bg-primary/15 dark:bg-primary/30 text-primary dark:text-blue-400 flex items-center justify-center text-[13px] font-bold">
          NC
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-carbon dark:text-slate-100 truncate">
            Alejandro Quintero
          </p>
          <p className="text-[11px] text-[#808080] dark:text-slate-400 truncate">
            Analista de datos
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
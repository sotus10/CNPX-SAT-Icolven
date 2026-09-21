import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ children, value, onChange, className = '' }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`appearance-none rounded-[10px] border border-line dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-8 py-2 text-[13px] font-semibold text-carbon dark:text-slate-100 outline-none hover:border-primary/40 focus:border-primary transition-colors cursor-pointer ${className}`}
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a6a6a6] pointer-events-none" />
  </div>
);

export default Select;
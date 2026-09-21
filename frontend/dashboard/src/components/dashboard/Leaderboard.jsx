import React, { useState } from 'react';
import { ChevronRight, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';

const RankBubble = ({ rank }) => (
  <span
    className={`h-6 w-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${
      rank === 1 ? 'bg-[#1b59f8] text-white' : 'bg-[#f0f1f6] text-[#4d4d4d]'
    }`}
  >
    {rank}
  </span>
);

const Delta = ({ delta }) => {
  if (delta === '0') {
    return <span className="text-[10px] font-semibold text-[#a6a6a6]">-</span>;
  }
  const up = delta.startsWith('+');
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(Number(delta))}
    </span>
  );
};

const Leaderboard = ({ title, tabs = [], rows = [], accent = '#1b59f8' }) => {
  const [activeTab, setActiveTab] = useState(tabs[0] ?? null);

  return (
    <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-carbon dark:text-slate-100">{title}</h3>
        <button type="button" className="flex items-center gap-0.5 text-[12px] font-semibold text-[#a6a6a6] dark:text-slate-400 hover:text-carbon dark:hover:text-slate-100 transition-colors">
          Ver todos
          <ChevronRight size={13} />
        </button>
      </div>

      {tabs.length > 0 && (
        <div className="flex gap-1 bg-canvas rounded-[10px] p-1 mb-4 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-carbon dark:text-slate-100' : 'text-[#808080] dark:text-slate-400 hover:text-carbon dark:hover:text-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={`${row.name}-${row.rank}`}>
            <a
              href="#top"
              onClick={(e) => e.preventDefault()}
              className={`flex items-center gap-3 px-2 py-2 rounded-[10px] transition-colors ${
                row.rank === 1 ? 'bg-primary/[0.06]' : 'hover:bg-[#f7f8fb] dark:hover:bg-slate-800'
              }`}
            >
              <RankBubble rank={row.rank} />
              <span className="text-[16px] leading-none">{row.emoji ?? '•'}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-carbon dark:text-slate-100 truncate">{row.name}</span>
                {row.subtitle && (
                  <span className="block text-[11px] text-[#a6a6a6] truncate">{row.subtitle}</span>
                )}
              </span>
              <Delta delta={row.delta} />
              <ChevronRight size={13} className="text-[#c7c9d1]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
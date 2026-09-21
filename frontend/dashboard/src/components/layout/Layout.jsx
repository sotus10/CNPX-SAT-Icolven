import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => (
  <div className="flex h-screen bg-canvas dark:bg-slate-950 text-carbon dark:text-slate-100 overflow-hidden transition-colors">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto px-6 py-6 bg-canvas dark:bg-slate-950 transition-colors">
        <Outlet />
      </main>
    </div>
  </div>
);

export default Layout;
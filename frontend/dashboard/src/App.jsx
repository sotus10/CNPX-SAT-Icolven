import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from 'react-query';
import store from './store/store';
import queryClient from './services/queryClient';
import Layout from './components/layout/Layout';
import BasinsPage from './pages/BasinsPage';
import HydrologyPage from './pages/HydrologyPage';
import AlertsPage from './pages/AlertsPage';
import PredictivePage from './pages/PredictivePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<BasinsPage />} />
            <Route path="/hydrology" element={<HydrologyPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/predictive" element={<PredictivePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  </Provider>
);

export default App;
import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import alertsReducer from './slices/alertsSlice';
import userReducer from './slices/userSlice';

const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    alerts: alertsReducer,
    user: userReducer,
  },
});

export default store;
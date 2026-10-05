import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../services/api';

export const loadAlerts = createAsyncThunk(
  'alerts/loadAlerts',
  // `api.fetchAlerts` ya envuelve los fallos en `new Error(mensaje)`, así que el
  // error normalizado no trae `response`: leer solo `error.message` evita que el
  // estado de error quede en undefined.
  async (_status, { rejectWithValue }) => {
    try {
      return await api.fetchAlerts();
    } catch (error) {
      return rejectWithValue(error.message ?? 'No fue posible consultar las alertas.');
    }
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState: {
    alerts: [],
    loading: false,
    error: null,
    unreadCount: 0,
    filter: 'active', // all, active, acknowledged, resolved
  },
  reducers: {
    addAlert: (state, action) => {
      state.alerts.unshift(action.payload);
      state.unreadCount += 1;
    },
    acknowledgeAlert: (state, action) => {
      const alert = state.alerts.find((a) => a.id === action.payload);
      if (alert) {
        alert.status = 'acknowledged';
        state.unreadCount -= 1;
      }
    },
    resolveAlert: (state, action) => {
      const alert = state.alerts.find((a) => a.id === action.payload);
      if (alert) {
        alert.status = 'resolved';
      }
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
    },
    setAlertFilter: (state, action) => {
      state.filter = action.payload;
    },
    hydrateAlerts: (state, action) => {
      state.alerts = action.payload;
      state.loading = false;
      state.error = null;
      state.unreadCount = action.payload.length;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
        state.unreadCount = action.payload.length;
      })
      .addCase(loadAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  addAlert,
  acknowledgeAlert,
  resolveAlert,
  removeAlert,
  setAlertFilter,
  hydrateAlerts,
} = alertsSlice.actions;
export default alertsSlice.reducer;
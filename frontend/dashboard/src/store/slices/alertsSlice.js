import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../services/api';

export const loadAlerts = createAsyncThunk(
  'alerts/loadAlerts',
  async (status = 'active', { rejectWithValue }) => {
    try {
      return await api.fetchAlerts(status);
    } catch (error) {
      return rejectWithValue(error.message);
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
      state.unreadCount = action.payload.filter((a) => a.status === 'active').length;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAlerts.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
        state.unreadCount = action.payload.filter((a) => a.status === 'active').length;
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
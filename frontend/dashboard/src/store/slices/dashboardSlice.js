import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../services/api';

export const loadDashboard = createAsyncThunk(
  'dashboard/loadDashboard',
  async ({ start_date, end_date } = {}, { rejectWithValue }) => {
    try {
      return await api.fetchMetrics({ start_date, end_date });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    metrics: null,
    kpis: [],
    series: [],
    loading: false,
    error: null,
    dateRange: '7d', // 24h, 7d, 30d, 90d, custom
  },
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    updateMetric: (state, action) => {
      state.metrics = { ...state.metrics, ...action.payload };
    },
    hydrate: (state, action) => {
      state.metrics = action.payload.metrics ?? state.metrics;
      state.kpis = action.payload.kpis ?? state.kpis;
      state.series = action.payload.series ?? state.series;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
        state.kpis = action.payload?.kpis || [];
        state.series = action.payload?.series || [];
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setDateRange, updateMetric, hydrate } = dashboardSlice.actions;
export default dashboardSlice.reducer;
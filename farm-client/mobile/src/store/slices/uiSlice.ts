import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface CropsFilters {
  status: 'all' | 'growing' | 'harvesting' | 'completed';
  farmId: string | null;
  healthMin: number | null;
  healthMax: number | null;
}

export interface LivestockFilters {
  type: 'all' | 'livestock' | 'poultry';
  farmId: string | null;
}

export interface FinanceFilters {
  type: 'all' | 'income' | 'expense';
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  total: number | null;
}

// Persisted UI state: selections + filters
export interface UIState {
  toasts: Toast[];
  globalLoading: boolean;
  selectedFarmId: string | null;
  selectedCropId: string | null;
  selectedLivestockId: string | null;
  filters: {
    farms: 'all' | 'active' | 'inactive';
    farmType: string;
    crops: CropsFilters;
    livestock: LivestockFilters;
    finance: FinanceFilters;
  };
  pagination: {
    farms: PaginationState;
    crops: PaginationState;
    livestock: PaginationState;
    finance: PaginationState;
  };
}

const defaultPagination = (): PaginationState => ({
  page: 1,
  limit: 20,
  hasMore: true,
  total: null,
});

const initialState: UIState = {
  toasts: [],
  globalLoading: false,
  selectedFarmId: null,
  selectedCropId: null,
  selectedLivestockId: null,
  filters: {
    farms: 'all',
    farmType: 'all',
    crops: { status: 'all', farmId: null, healthMin: null, healthMax: null },
    livestock: { type: 'all', farmId: null },
    finance: { type: 'all', category: null, dateFrom: null, dateTo: null },
  },
  pagination: {
    farms: defaultPagination(),
    crops: defaultPagination(),
    livestock: defaultPagination(),
    finance: defaultPagination(),
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    setSelectedFarmId: (state, action: PayloadAction<string | null>) => {
      state.selectedFarmId = action.payload;
    },
    setSelectedCropId: (state, action: PayloadAction<string | null>) => {
      state.selectedCropId = action.payload;
    },
    setSelectedLivestockId: (state, action: PayloadAction<string | null>) => {
      state.selectedLivestockId = action.payload;
    },
    setFarmsFilter: (state, action: PayloadAction<UIState['filters']['farms']>) => {
      state.filters.farms = action.payload;
      state.pagination.farms = { ...defaultPagination() };
    },
    setFarmTypeFilter: (state, action: PayloadAction<string>) => {
      state.filters.farmType = action.payload;
      state.pagination.farms = { ...defaultPagination() };
    },
    setCropsFilter: (state, action: PayloadAction<Partial<CropsFilters>>) => {
      state.filters.crops = { ...state.filters.crops, ...action.payload };
      state.pagination.crops = { ...defaultPagination() };
    },
    setLivestockFilter: (state, action: PayloadAction<Partial<LivestockFilters>>) => {
      state.filters.livestock = { ...state.filters.livestock, ...action.payload };
      state.pagination.livestock = { ...defaultPagination() };
    },
    setFinanceFilter: (state, action: PayloadAction<Partial<FinanceFilters>>) => {
      state.filters.finance = { ...state.filters.finance, ...action.payload };
      state.pagination.finance = { ...defaultPagination() };
    },
    setPagination: (
      state,
      action: PayloadAction<{ module: keyof UIState['pagination']; data: Partial<PaginationState> }>
    ) => {
      state.pagination[action.payload.module] = {
        ...state.pagination[action.payload.module],
        ...action.payload.data,
      };
    },
    resetPagination: (state, action: PayloadAction<keyof UIState['pagination']>) => {
      state.pagination[action.payload] = defaultPagination();
    },
    resetUiState: (state) => {
      state.selectedFarmId = null;
      state.selectedCropId = null;
      state.selectedLivestockId = null;
      state.filters = initialState.filters;
      state.pagination = initialState.pagination;
    },
  },
});

export const {
  showToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
  setSelectedFarmId,
  setSelectedCropId,
  setSelectedLivestockId,
  setFarmsFilter,
  setFarmTypeFilter,
  setCropsFilter,
  setLivestockFilter,
  setFinanceFilter,
  setPagination,
  resetPagination,
  resetUiState,
} = uiSlice.actions;

export default uiSlice.reducer;

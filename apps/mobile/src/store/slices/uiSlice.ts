import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface UIState {
  toasts: Toast[];
  globalLoading: boolean;
  selectedFarmId: string | null;
  selectedCropId: string | null;
}

const initialState: UIState = {
  toasts: [],
  globalLoading: false,
  selectedFarmId: null,
  selectedCropId: null,
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
  },
});

export const {
  showToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
  setSelectedFarmId,
  setSelectedCropId,
} = uiSlice.actions;

export default uiSlice.reducer;

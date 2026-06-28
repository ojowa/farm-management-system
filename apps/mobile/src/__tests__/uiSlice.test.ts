import uiReducer, {
  showToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
  setSelectedFarmId,
  setSelectedCropId,
  setSelectedLivestockId,
  setFarmsFilter,
  setCropsFilter,
  setLivestockFilter,
  setFinanceFilter,
  setPagination,
  resetPagination,
  resetUiState,
  UIState,
} from '../store/slices/uiSlice';

const initialState: UIState = {
  toasts: [],
  globalLoading: false,
  selectedFarmId: null,
  selectedCropId: null,
  selectedLivestockId: null,
  filters: {
    farms: 'all',
    crops: { status: 'all', farmId: null, healthMin: null, healthMax: null },
    livestock: { type: 'all', farmId: null },
    finance: { type: 'all', category: null, dateFrom: null, dateTo: null },
  },
  pagination: {
    farms: { page: 1, limit: 20, hasMore: true, total: null },
    crops: { page: 1, limit: 20, hasMore: true, total: null },
    livestock: { page: 1, limit: 20, hasMore: true, total: null },
    finance: { page: 1, limit: 20, hasMore: true, total: null },
  },
};

describe('uiSlice', () => {
  it('should return the initial state', () => {
    expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('toasts', () => {
    it('showToast adds a toast', () => {
      const toast = { id: '1', message: 'Saved!', type: 'success' as const };
      const state = uiReducer(initialState, showToast(toast));
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0]).toEqual(toast);
    });

    it('removeToast removes by id', () => {
      const state = uiReducer(
        { ...initialState, toasts: [{ id: '1', message: 'a', type: 'success' }] },
        removeToast('1')
      );
      expect(state.toasts).toHaveLength(0);
    });

    it('clearToasts removes all', () => {
      const state = uiReducer(
        { ...initialState, toasts: [{ id: '1', message: 'a', type: 'success' }] },
        clearToasts()
      );
      expect(state.toasts).toHaveLength(0);
    });
  });

  describe('globalLoading', () => {
    it('sets global loading', () => {
      expect(uiReducer(initialState, setGlobalLoading(true)).globalLoading).toBe(true);
    });
  });

  describe('selections', () => {
    it('setSelectedFarmId', () => {
      expect(uiReducer(initialState, setSelectedFarmId('f1')).selectedFarmId).toBe('f1');
    });
    it('setSelectedCropId', () => {
      expect(uiReducer(initialState, setSelectedCropId('c1')).selectedCropId).toBe('c1');
    });
    it('setSelectedLivestockId', () => {
      expect(uiReducer(initialState, setSelectedLivestockId('l1')).selectedLivestockId).toBe('l1');
    });
  });

  describe('filters', () => {
    it('setFarmsFilter updates and resets pagination', () => {
      const state = uiReducer(
        { ...initialState, pagination: { ...initialState.pagination, farms: { page: 5, limit: 20, hasMore: false, total: 100 } } },
        setFarmsFilter('active')
      );
      expect(state.filters.farms).toBe('active');
      expect(state.pagination.farms.page).toBe(1);
      expect(state.pagination.farms.hasMore).toBe(true);
    });

    it('setCropsFilter merges partial filter', () => {
      const state = uiReducer(initialState, setCropsFilter({ status: 'growing', farmId: 'f1' }));
      expect(state.filters.crops.status).toBe('growing');
      expect(state.filters.crops.farmId).toBe('f1');
      expect(state.filters.crops.healthMin).toBeNull(); // unchanged
    });

    it('setLivestockFilter merges partial', () => {
      const state = uiReducer(initialState, setLivestockFilter({ type: 'poultry' }));
      expect(state.filters.livestock.type).toBe('poultry');
    });

    it('setFinanceFilter merges partial', () => {
      const state = uiReducer(initialState, setFinanceFilter({ category: 'Seeds', type: 'expense' }));
      expect(state.filters.finance.category).toBe('Seeds');
      expect(state.filters.finance.type).toBe('expense');
    });
  });

  describe('pagination', () => {
    it('setPagination updates specific module', () => {
      const state = uiReducer(initialState, setPagination({
        module: 'farms',
        data: { page: 3, total: 50 },
      }));
      expect(state.pagination.farms.page).toBe(3);
      expect(state.pagination.farms.total).toBe(50);
      expect(state.pagination.farms.limit).toBe(20); // unchanged
    });

    it('resetPagination resets specific module', () => {
      const modified = uiReducer(initialState, setPagination({
        module: 'crops',
        data: { page: 10, hasMore: false },
      }));
      const state = uiReducer(modified, resetPagination('crops'));
      expect(state.pagination.crops).toEqual({ page: 1, limit: 20, hasMore: true, total: null });
    });
  });

  describe('resetUiState', () => {
    it('resets selections, filters, and pagination', () => {
      let state = uiReducer(initialState, setSelectedFarmId('f1'));
      state = uiReducer(state, setSelectedCropId('c1'));
      state = uiReducer(state, setFarmsFilter('inactive'));
      state = uiReducer(state, resetUiState());
      expect(state.selectedFarmId).toBeNull();
      expect(state.selectedCropId).toBeNull();
      expect(state.filters.farms).toBe('all');
    });
  });
});

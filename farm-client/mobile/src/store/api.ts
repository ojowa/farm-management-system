import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { RootState } from './store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.socketAccessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * The API gateway wraps every response in { success, data, timestamp,
 * requestId }. The axios client (services/api.ts) unwraps that envelope in
 * its response interceptor, but RTK Query bypasses axios — without the same
 * unwrap here, screens receive the envelope object and read `undefined`
 * rows (the farm list always rendered empty because of this).
 */
const baseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const body = result.data as Record<string, unknown> | undefined;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    result.data = body.data;
  }
  return result;
};

/**
 * Extract the rows from a list payload regardless of which list key the
 * endpoint uses (`data`, `farms`, `crops`, …). Keeps `providesTags` from
 * throwing (`result.map is not a function`) on object payloads.
 */
function rowsOf(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    const payload = result as Record<string, unknown>;
    for (const key of ['data', 'farms', 'crops', 'items', 'livestock', 'expenses', 'sales', 'tasks']) {
      if (Array.isArray(payload[key])) return payload[key] as any[];
    }
  }
  return [];
}

function listTags(entity: string, result: unknown) {
  return [
    ...rowsOf(result).map(({ id }: { id: string }) => ({ type: entity as any, id })),
    { type: entity as any, id: 'LIST' },
  ];
}

// ─── Farms ─────────────────────────────────────────────────────────────────────

export const farmsApi = createApi({
  reducerPath: 'farmsApi',
  baseQuery,
  tagTypes: ['Farm'],
  endpoints: (builder) => ({
    listFarms: builder.query({
      query: (params) => ({ url: '/farms', params }),
      providesTags: (result) => listTags('Farm', result),
    }),
    getFarm: builder.query({
      query: (id: string) => `/farms/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Farm', id }],
    }),
    createFarm: builder.mutation({
      query: (data) => ({ url: '/farms', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Farm', id: 'LIST' }],
    }),
    updateFarm: builder.mutation({
      query: ({ id, data }) => ({ url: `/farms/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Farm', id },
        { type: 'Farm', id: 'LIST' },
      ],
    }),
    deleteFarm: builder.mutation({
      query: (id: string) => ({ url: `/farms/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Farm', id },
        { type: 'Farm', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListFarmsQuery,
  useGetFarmQuery,
  useCreateFarmMutation,
  useUpdateFarmMutation,
  useDeleteFarmMutation,
} = farmsApi;

// ─── Crops ─────────────────────────────────────────────────────────────────────

export const cropsApi = createApi({
  reducerPath: 'cropsApi',
  baseQuery,
  tagTypes: ['Crop'],
  endpoints: (builder) => ({
    listCrops: builder.query({
      query: (params) => ({ url: '/crops', params }),
      providesTags: (result) => listTags('Crop', result),
    }),
    getCrop: builder.query({
      query: (id: string) => `/crops/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Crop', id }],
    }),
    createCrop: builder.mutation({
      query: (data) => ({ url: '/crops', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Crop', id: 'LIST' }],
    }),
    updateCrop: builder.mutation({
      query: ({ id, data }) => ({ url: `/crops/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Crop', id },
        { type: 'Crop', id: 'LIST' },
      ],
    }),
    deleteCrop: builder.mutation({
      query: (id: string) => ({ url: `/crops/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Crop', id },
        { type: 'Crop', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListCropsQuery,
  useGetCropQuery,
  useCreateCropMutation,
  useUpdateCropMutation,
  useDeleteCropMutation,
} = cropsApi;

// ─── Livestock ─────────────────────────────────────────────────────────────────

export const livestockApi = createApi({
  reducerPath: 'livestockApi',
  baseQuery,
  tagTypes: ['Livestock'],
  endpoints: (builder) => ({
    listLivestock: builder.query({
      query: (params) => ({ url: '/livestock', params }),
      providesTags: (result) => listTags('Livestock', result),
    }),
    getLivestock: builder.query({
      query: (id: string) => `/livestock/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Livestock', id }],
    }),
    createLivestock: builder.mutation({
      query: (data) => ({ url: '/livestock', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Livestock', id: 'LIST' }],
    }),
    updateLivestock: builder.mutation({
      query: ({ id, data }) => ({ url: `/livestock/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
      ],
    }),
    deleteLivestock: builder.mutation({
      query: (id: string) => ({ url: `/livestock/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListLivestockQuery,
  useGetLivestockQuery,
  useCreateLivestockMutation,
  useUpdateLivestockMutation,
  useDeleteLivestockMutation,
} = livestockApi;

// ─── Finance ───────────────────────────────────────────────────────────────────

export const financeApi = createApi({
  reducerPath: 'financeApi',
  baseQuery,
  tagTypes: ['Expense', 'Sale'],
  endpoints: (builder) => ({
    listExpenses: builder.query({
      query: (params) => ({ url: '/expenses', params }),
      providesTags: (result) => listTags('Expense', result),
    }),
    listSales: builder.query({
      query: (params) => ({ url: '/sales', params }),
      providesTags: (result) => listTags('Sale', result),
    }),
    createExpense: builder.mutation({
      query: (data) => ({ url: '/expenses', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    createSale: builder.mutation({
      query: (data) => ({ url: '/sales', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Sale', id: 'LIST' }],
    }),
  }),
});

export const {
  useListExpensesQuery,
  useListSalesQuery,
  useCreateExpenseMutation,
  useCreateSaleMutation,
} = financeApi;

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery,
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    listTasks: builder.query({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: (result) => listTags('Task', result),
    }),
    getTask: builder.query({
      query: (id: string) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation({
      query: (data) => ({ url: '/tasks', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),
    updateTask: builder.mutation({
      query: ({ id, data }) => ({ url: `/tasks/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),
    updateTaskStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),
    deleteTask: builder.mutation({
      query: (id: string) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} = tasksApi;

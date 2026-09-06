import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

const baseQuery = fetchBaseQuery({
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

// ─── Farms ─────────────────────────────────────────────────────────────────────

export const farmsApi = createApi({
  reducerPath: 'farmsApi',
  baseQuery,
  tagTypes: ['Farm'],
  endpoints: (builder) => ({
    listFarms: builder.query({
      query: (params) => ({ url: '/farms', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Farm' as const, id })),
              { type: 'Farm' as const, id: 'LIST' },
            ]
          : [{ type: 'Farm' as const, id: 'LIST' }],
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Crop' as const, id })),
              { type: 'Crop' as const, id: 'LIST' },
            ]
          : [{ type: 'Crop' as const, id: 'LIST' }],
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Livestock' as const, id })),
              { type: 'Livestock' as const, id: 'LIST' },
            ]
          : [{ type: 'Livestock' as const, id: 'LIST' }],
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense' as const, id: 'LIST' },
            ]
          : [{ type: 'Expense' as const, id: 'LIST' }],
    }),
    listSales: builder.query({
      query: (params) => ({ url: '/sales', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Sale' as const, id })),
              { type: 'Sale' as const, id: 'LIST' },
            ]
          : [{ type: 'Sale' as const, id: 'LIST' }],
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Task' as const, id })),
              { type: 'Task' as const, id: 'LIST' },
            ]
          : [{ type: 'Task' as const, id: 'LIST' }],
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
        method: 'PATCH',
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

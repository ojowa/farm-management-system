import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const cropsApi = createApi({
  reducerPath: 'cropsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.socketAccessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Crop'],
  endpoints: (builder) => ({
    listCrops: builder.query({
      query: (params) => ({
        url: '/crops',
        params,
      }),
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
      query: (data) => ({
        url: '/crops',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Crop', id: 'LIST' }],
    }),
    updateCrop: builder.mutation({
      query: ({ id, data }) => ({
        url: `/crops/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Crop', id },
        { type: 'Crop', id: 'LIST' },
      ],
    }),
    deleteCrop: builder.mutation({
      query: (id: string) => ({
        url: `/crops/${id}`,
        method: 'DELETE',
      }),
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

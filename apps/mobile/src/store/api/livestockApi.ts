import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export const livestockApi = createApi({
  reducerPath: 'livestockApi',
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
  tagTypes: ['Livestock'],
  endpoints: (builder) => ({
    listLivestock: builder.query({
      query: (params) => ({
        url: '/livestock',
        params,
      }),
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
      query: (data) => ({
        url: '/livestock',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Livestock', id: 'LIST' }],
    }),
    updateLivestock: builder.mutation({
      query: ({ id, data }) => ({
        url: `/livestock/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
      ],
    }),
    deleteLivestock: builder.mutation({
      query: (id: string) => ({
        url: `/livestock/${id}`,
        method: 'DELETE',
      }),
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

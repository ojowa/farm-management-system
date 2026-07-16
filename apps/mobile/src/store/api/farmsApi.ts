import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const farmsApi = createApi({
  reducerPath: 'farmsApi',
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
  tagTypes: ['Farm'],
  endpoints: (builder) => ({
    listFarms: builder.query({
      query: (params) => ({
        url: '/farms',
        params,
      }),
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
      query: (data) => ({
        url: '/farms',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Farm', id: 'LIST' }],
    }),
    updateFarm: builder.mutation({
      query: ({ id, data }) => ({
        url: `/farms/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Farm', id },
        { type: 'Farm', id: 'LIST' },
      ],
    }),
    deleteFarm: builder.mutation({
      query: (id: string) => ({
        url: `/farms/${id}`,
        method: 'DELETE',
      }),
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

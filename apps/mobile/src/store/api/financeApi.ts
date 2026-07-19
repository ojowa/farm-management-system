import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export const financeApi = createApi({
  reducerPath: 'financeApi',
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
  tagTypes: ['Expense', 'Sale'],
  endpoints: (builder) => ({
    listExpenses: builder.query({
      query: (params) => ({
        url: '/finance/expenses',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense' as const, id: 'LIST' },
            ]
          : [{ type: 'Expense' as const, id: 'LIST' }],
    }),
    listSales: builder.query({
      query: (params) => ({
        url: '/finance/sales',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: 'Sale' as const, id })),
              { type: 'Sale' as const, id: 'LIST' },
            ]
          : [{ type: 'Sale' as const, id: 'LIST' }],
    }),
    createExpense: builder.mutation({
      query: (data) => ({
        url: '/finance/expenses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    createSale: builder.mutation({
      query: (data) => ({
        url: '/finance/sales',
        method: 'POST',
        body: data,
      }),
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

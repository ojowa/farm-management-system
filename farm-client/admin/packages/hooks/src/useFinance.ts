import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FinanceAPI } from '@farm/api-client';

export function useExpenses(financeApi: FinanceAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => financeApi.listExpenses(params),
  });
}

export function useSales(financeApi: FinanceAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => financeApi.listSales(params),
  });
}

export function useCreateExpense(financeApi: FinanceAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useCreateSale(financeApi: FinanceAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

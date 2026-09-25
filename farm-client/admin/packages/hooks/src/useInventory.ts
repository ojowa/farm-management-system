import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryAPI } from '@farm/api-client';

export function useInventoryItems(inventoryApi: InventoryAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => inventoryApi.list(params),
  });
}

export function useInventoryItem(inventoryApi: InventoryAPI, id: string) {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryApi.get(id),
    enabled: !!id,
  });
}

export function useCreateInventoryItem(inventoryApi: InventoryAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateInventoryItem(inventoryApi: InventoryAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inventoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteInventoryItem(inventoryApi: InventoryAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

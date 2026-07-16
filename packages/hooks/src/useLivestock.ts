import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LivestockAPI } from '@farm/api-client';

export function useLivestock(livestockApi: LivestockAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['livestock', params],
    queryFn: () => livestockApi.list(params),
  });
}

export function useLivestockAnimal(livestockApi: LivestockAPI, id: string) {
  return useQuery({
    queryKey: ['livestock', id],
    queryFn: () => livestockApi.get(id),
    enabled: !!id,
  });
}

export function useCreateLivestock(livestockApi: LivestockAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => livestockApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
    },
  });
}

export function useUpdateLivestock(livestockApi: LivestockAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      livestockApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
    },
  });
}

export function useDeleteLivestock(livestockApi: LivestockAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => livestockApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
    },
  });
}

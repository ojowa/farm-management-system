import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FarmsAPI } from '@farm/api-client';

export function useFarms(farmsApi: FarmsAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['farms', params],
    queryFn: () => farmsApi.list(params),
  });
}

export function useFarm(farmsApi: FarmsAPI, id: string) {
  return useQuery({
    queryKey: ['farms', id],
    queryFn: () => farmsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateFarm(farmsApi: FarmsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => farmsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useUpdateFarm(farmsApi: FarmsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      farmsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useDeleteFarm(farmsApi: FarmsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => farmsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

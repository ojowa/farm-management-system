import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CropsAPI } from '@farm/api-client';

export function useCrops(cropsApi: CropsAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['crops', params],
    queryFn: () => cropsApi.list(params),
  });
}

export function useCrop(cropsApi: CropsAPI, id: string) {
  return useQuery({
    queryKey: ['crops', id],
    queryFn: () => cropsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCrop(cropsApi: CropsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cropsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
  });
}

export function useUpdateCrop(cropsApi: CropsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      cropsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
  });
}

export function useDeleteCrop(cropsApi: CropsAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cropsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
  });
}

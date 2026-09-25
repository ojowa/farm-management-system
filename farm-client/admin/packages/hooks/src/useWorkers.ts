import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkersAPI } from '@farm/api-client';

export function useWorkers(workersApi: WorkersAPI, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['workers', params],
    queryFn: () => workersApi.list(params),
  });
}

export function useWorker(workersApi: WorkersAPI, id: string) {
  return useQuery({
    queryKey: ['workers', id],
    queryFn: () => workersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorker(workersApi: WorkersAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => workersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUpdateWorker(workersApi: WorkersAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      workersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useDeleteWorker(workersApi: WorkersAPI) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

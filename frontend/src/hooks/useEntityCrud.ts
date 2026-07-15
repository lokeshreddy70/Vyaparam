import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntity,
  deleteEntity,
  exportEntities,
  importEntities,
  listEntities,
  restoreEntity,
  updateEntity,
  type ListParams,
} from "../services/entityService";

type UseEntityCrudParams = {
  endpoint: string;
  queryKey: string;
  listParams: ListParams;
  importPath?: string;
  exportPath?: string;
};

export function useEntityCrud<TRecord extends { id?: string }>(params: UseEntityCrudParams) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: [params.queryKey, params.listParams],
    queryFn: async () => listEntities<unknown>(params.endpoint, params.listParams),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [params.queryKey] });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      createEntity<Record<string, unknown>, unknown>(params.endpoint, payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      updateEntity<Record<string, unknown>, unknown>(params.endpoint, id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteEntity<unknown>(params.endpoint, id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => restoreEntity<unknown>(params.endpoint, id),
    onSuccess: invalidate,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!params.importPath) return null;
      return importEntities<unknown>(params.importPath, file);
    },
    onSuccess: invalidate,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!params.exportPath) return null;
      return exportEntities<unknown>(params.exportPath);
    },
  });

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
    importMutation,
    exportMutation,
  };
}

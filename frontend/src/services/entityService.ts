import { api } from "../api/client";

export type ListParams = {
  page?: number;
  limit?: number;
  searchParam?: string;
  search?: string;
  filters?: Record<string, unknown>;
};

export async function listEntities<T>(endpoint: string, params: ListParams) {
  const response = await api.get<T>(endpoint, {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && params.searchParam ? { [params.searchParam]: params.search } : {}),
      ...(params.filters ?? {}),
    },
  });
  return response.data;
}

export async function readEntity<T>(endpoint: string, id: string) {
  const response = await api.get<T>(`${endpoint}/${id}`);
  return response.data;
}

export async function readEntitySubResource<T>(endpoint: string, id: string, subPath: string) {
  const response = await api.get<T>(`${endpoint}/${id}/${subPath}`);
  return response.data;
}

export async function createEntity<TPayload extends Record<string, unknown>, TResult>(
  endpoint: string,
  payload: TPayload,
) {
  const response = await api.post<TResult>(endpoint, payload);
  return response.data;
}

export async function updateEntity<TPayload extends Record<string, unknown>, TResult>(
  endpoint: string,
  id: string,
  payload: TPayload,
) {
  const response = await api.patch<TResult>(`${endpoint}/${id}`, payload);
  return response.data;
}

export async function deleteEntity<TResult>(endpoint: string, id: string) {
  const response = await api.delete<TResult>(`${endpoint}/${id}`);
  return response.data;
}

export async function restoreEntity<TResult>(endpoint: string, id: string) {
  const response = await api.patch<TResult>(`${endpoint}/${id}/restore`);
  return response.data;
}

export async function importEntities<TResult>(importPath: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<TResult>(importPath, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function exportEntities<TResult>(exportPath: string) {
  const response = await api.get<TResult>(exportPath);
  return response.data;
}

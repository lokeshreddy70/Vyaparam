export type UserRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "KITCHEN_STAFF"
  | "WAITER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId?: string;
  branchId?: string | null;
};

export type ApiEnvelope<T> = {
  data: T;
};

export type PermissionName = string;

export type NavModule = {
  key: string;
  title: string;
  path: string;
  permission?: string;
};

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "textarea" | "date";
  required?: boolean;
};

export type CrudModuleConfig = {
  title: string;
  endpoint: string;
  permissionRead: string;
  permissionManage: string;
  fields: CrudField[];
  searchParam?: string;
  supportsRestore?: boolean;
  exportPath?: string;
  importPath?: string;
};

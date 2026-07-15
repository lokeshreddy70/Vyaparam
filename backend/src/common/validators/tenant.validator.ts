import { ForbiddenException } from "@nestjs/common";

function compareTenantField(userValue: string | null | undefined, incomingValue: unknown, field: string) {
  if (!userValue || incomingValue === undefined || incomingValue === null) return;
  if (String(incomingValue) !== userValue) {
    throw new ForbiddenException(`Cross-tenant access denied for ${field}`);
  }
}

export function validateTenantIsolation(user: any, request: any) {
  if (!user) return;

  compareTenantField(user.businessId, request.headers?.["x-business-id"], "businessId");
  compareTenantField(user.branchId, request.headers?.["x-branch-id"], "branchId");

  compareTenantField(user.businessId, request.params?.businessId, "businessId");
  compareTenantField(user.branchId, request.params?.branchId, "branchId");

  compareTenantField(user.businessId, request.query?.businessId, "businessId");
  compareTenantField(user.branchId, request.query?.branchId, "branchId");

  compareTenantField(user.businessId, request.body?.businessId, "businessId");
  compareTenantField(user.branchId, request.body?.branchId, "branchId");
}

import { ForbiddenException } from "@nestjs/common";
import { validateTenantIsolation } from "./tenant.validator";

describe("validateTenantIsolation", () => {
  it("allows matching tenant", () => {
    expect(() =>
      validateTenantIsolation(
        { businessId: "b1", branchId: "br1" },
        {
          headers: { "x-business-id": "b1", "x-branch-id": "br1" },
          params: {},
          query: {},
          body: {},
        },
      ),
    ).not.toThrow();
  });

  it("blocks cross-tenant access", () => {
    expect(() =>
      validateTenantIsolation(
        { businessId: "b1", branchId: "br1" },
        { headers: { "x-business-id": "b2" }, params: {}, query: {}, body: {} },
      ),
    ).toThrow(ForbiddenException);
  });
});

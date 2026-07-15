import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { DeprecationInterceptor } from "./deprecation.interceptor";

describe("DeprecationInterceptor", () => {
  it("sets deprecation headers", (done) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        since: "2026-07-15",
        alternative: "/api/v1/new",
      }),
    } as unknown as Reflector;

    const headers: Record<string, string> = {};
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: (k: string, v: string) => {
            headers[k] = v;
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const interceptor = new DeprecationInterceptor(reflector);

    interceptor.intercept(context, { handle: () => of({ ok: true }) } as any).subscribe({
      next: () => {
        expect(headers.Deprecation).toBe("true");
        expect(headers.Warning).toContain("Deprecated since");
        done();
      },
      error: done,
    });
  });
});

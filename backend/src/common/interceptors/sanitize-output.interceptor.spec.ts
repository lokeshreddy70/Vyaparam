import { ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { SanitizeOutputInterceptor } from "./sanitize-output.interceptor";

describe("SanitizeOutputInterceptor", () => {
  it("sanitizes outgoing payload", (done) => {
    const interceptor = new SanitizeOutputInterceptor();
    const context = {} as ExecutionContext;

    interceptor
      .intercept(context, { handle: () => of({ note: "<script>x</script>safe" }) } as any)
      .subscribe({
        next: (value) => {
          expect(value).toEqual({ note: "safe" });
          done();
        },
        error: done,
      });
  });
});

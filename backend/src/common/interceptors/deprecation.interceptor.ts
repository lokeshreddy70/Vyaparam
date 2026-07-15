import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { DEPRECATED_ROUTE_KEY, DeprecatedRouteMetadata } from "../decorators/deprecated.decorator";

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const deprecated = this.reflector.getAllAndOverride<DeprecatedRouteMetadata>(DEPRECATED_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (deprecated) {
      const response = context.switchToHttp().getResponse();
      response.setHeader("Deprecation", "true");
      response.setHeader(
        "Warning",
        `299 - \"Deprecated since ${deprecated.since}${deprecated.message ? `: ${deprecated.message}` : ""}\"`,
      );
      if (deprecated.sunsetAt) {
        response.setHeader("Sunset", new Date(deprecated.sunsetAt).toUTCString());
      }
      if (deprecated.alternative) {
        response.setHeader("Link", `<${deprecated.alternative}>; rel=\"successor-version\"`);
      }
    }

    return next.handle();
  }
}

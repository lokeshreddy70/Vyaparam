import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { sanitizeValue } from "../utils/sanitization.util";

@Injectable()
export class SanitizeOutputInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => sanitizeValue(value)));
  }
}

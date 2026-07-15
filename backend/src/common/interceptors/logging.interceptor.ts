import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const requestId = request.requestId ?? request.headers["x-request-id"]?.toString() ?? randomUUID();
    const correlationId = request.headers["x-correlation-id"]?.toString() ?? randomUUID();
    request.requestId = requestId;
    request.correlationId = correlationId;
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-correlation-id", correlationId);
    const start = Date.now();

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode ?? 200;
        const businessId = request.user?.businessId ?? null;
        const branchId = request.user?.branchId ?? null;
        const userId = request.user?.id ?? null;
        const requestBody = request.body ?? null;
        const responseSnapshot =
          responseBody && typeof responseBody === "object" ? responseBody : { value: responseBody };

        void this.prisma.apiRequestLog.create({
          data: {
            businessId,
            branchId,
            userId,
            correlationId,
            method,
            path: url,
            statusCode,
            durationMs: duration,
            ipAddress: request.ip ?? null,
            userAgent: request.headers["user-agent"]?.toString() ?? null,
            requestBody,
            responseBody: responseSnapshot,
            metadata: { requestId },
            createdBy: userId,
            updatedBy: userId,
          },
        }).catch(() => undefined);

        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: "INFO",
            message: "API_REQUEST",
            requestId,
            correlationId,
            method,
            path: url,
            statusCode,
            durationMs: duration,
            businessId,
            userId,
          }),
        );
      }),
    );
  }
}

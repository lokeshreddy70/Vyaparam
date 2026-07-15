import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: any; correlationId?: string; requestId?: string }>();
    const fallbackStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    const errorType = (exception as any)?.type;
    const derivedStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : Number((exception as any)?.status ?? (exception as any)?.statusCode) ||
          (errorType === "entity.too.large" ? HttpStatus.PAYLOAD_TOO_LARGE : 0) ||
          ((exception as any)?.name === "PayloadTooLargeError" ? HttpStatus.PAYLOAD_TOO_LARGE : fallbackStatus);
    const status = Number.isFinite(derivedStatus) ? derivedStatus : fallbackStatus;
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as any)?.message ?? "Internal server error";
    const requestId = request.requestId ?? request.headers["x-request-id"]?.toString() ?? randomUUID();
    const correlationId = request.correlationId ?? request.headers["x-correlation-id"]?.toString() ?? randomUUID();

    void this.prisma.apiErrorLog
      .create({
        data: {
          businessId: request.user?.businessId ?? null,
          branchId: request.user?.branchId ?? null,
          userId: request.user?.id ?? null,
          correlationId,
          method: request.method,
          path: request.url,
          statusCode: status,
          message: typeof message === "string" ? message : JSON.stringify(message),
          stack: (exception as any)?.stack ?? null,
          errorType: exception instanceof HttpException ? "HttpException" : "UnhandledException",
          context: {
            requestId,
            query: request.query,
            params: request.params,
            body: request.body,
          },
          createdBy: request.user?.id ?? null,
          updatedBy: request.user?.id ?? null,
        },
      })
      .catch(() => undefined);

    if (!(exception instanceof HttpException)) {
      // Surface unexpected runtime errors for server-side diagnostics.
      // eslint-disable-next-line no-console
      console.error(exception);
    }

    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "ERROR",
        message: "API_ERROR",
        requestId,
        correlationId,
        path: request.url,
        method: request.method,
        statusCode: status,
      }),
    );

    response.setHeader("x-request-id", requestId);
    response.setHeader("x-correlation-id", correlationId);
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      correlationId,
      message,
    });
  }
}

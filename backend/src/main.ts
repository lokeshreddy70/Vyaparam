import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { Express } from "express";
import compression from "compression";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { requestContextMiddleware } from "./common/middleware/request-context.middleware";
import { SanitizeInputPipe } from "./common/pipes/sanitize-input.pipe";
import { setupSwagger } from "./swagger";

export function getCorsOptions() {
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    cors: {
      origin: allowedOrigins.includes("*")
        ? true
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
              return;
            }
            callback(new Error("CORS origin blocked"), false);
          },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "X-Request-Id",
        "X-Correlation-Id",
        "X-Business-Id",
        "X-Branch-Id",
      ],
      exposedHeaders: ["X-Request-Id", "X-Correlation-Id", "Deprecation", "Sunset", "Warning"],
      maxAge: 600,
    },
  };
}

export async function createApp(expressInstance?: Express) {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), getCorsOptions())
    : await NestFactory.create(AppModule, getCorsOptions());

  app.enableShutdownHooks();
  app.use(requestContextMiddleware);
  app.use(compression());
  // In serverless adapters (e.g., Vercel), request body may already be parsed.
  // Avoid re-parsing streams there to prevent "stream is not readable" errors.
  if (!expressInstance) {
    app.use(json({ limit: process.env.REQUEST_SIZE_LIMIT ?? "1mb" }));
    app.use(urlencoded({ limit: process.env.REQUEST_SIZE_LIMIT ?? "1mb", extended: true }));
  }
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: "no-referrer" },
      contentSecurityPolicy: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    new SanitizeInputPipe(),
  );
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  setupSwagger(app);

  return app;
}

async function bootstrap() {
  const app = await createApp();

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

if (require.main === module) {
  void bootstrap();
}

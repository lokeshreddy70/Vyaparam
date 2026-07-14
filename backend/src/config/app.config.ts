import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
  env: process.env.NODE_ENV ?? "development",
}));

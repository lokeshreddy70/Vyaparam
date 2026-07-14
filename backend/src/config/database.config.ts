import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  url: process.env.DATABASE_URL,
  pool: Number(process.env.DATABASE_POOL ?? 10),
}));

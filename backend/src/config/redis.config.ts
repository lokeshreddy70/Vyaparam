import { registerAs } from "@nestjs/config";

export default registerAs("redis", () => ({
  url: process.env.REDIS_URL,
  ttl: Number(process.env.REDIS_TTL ?? 300),
}));

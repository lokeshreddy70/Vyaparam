import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? "15m",
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? "7d",
}));

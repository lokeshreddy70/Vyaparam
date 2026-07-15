import process from "node:process";

const required = [
  "NODE_ENV",
  "PORT",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CORS_ALLOWED_ORIGINS",
];

const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === "");

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (String(process.env.JWT_ACCESS_SECRET).length < 24 || String(process.env.JWT_REFRESH_SECRET).length < 24) {
  console.error("JWT secrets must be at least 24 characters for production environments.");
  process.exit(1);
}

console.log("Environment validation passed.");

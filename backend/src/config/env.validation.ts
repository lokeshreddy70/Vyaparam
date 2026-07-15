export type ValidatedEnv = {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ALLOWED_ORIGINS: string;
  REQUEST_SIZE_LIMIT: string;
  SLOW_QUERY_THRESHOLD_MS: string;
};

function readEnv(env: Record<string, unknown>, key: string, fallback?: string): string {
  const value = env[key];
  if ((value === undefined || value === null || value === "") && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return String(value ?? fallback ?? "");
}

export function validateEnv(env: Record<string, unknown>): ValidatedEnv {
  return {
    NODE_ENV: readEnv(env, "NODE_ENV", "development"),
    PORT: readEnv(env, "PORT", "3000"),
    DATABASE_URL: readEnv(env, "DATABASE_URL"),
    JWT_ACCESS_SECRET: readEnv(env, "JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: readEnv(env, "JWT_REFRESH_SECRET"),
    CORS_ALLOWED_ORIGINS: readEnv(env, "CORS_ALLOWED_ORIGINS", "*"),
    REQUEST_SIZE_LIMIT: readEnv(env, "REQUEST_SIZE_LIMIT", "1mb"),
    SLOW_QUERY_THRESHOLD_MS: readEnv(env, "SLOW_QUERY_THRESHOLD_MS", "500"),
  };
}

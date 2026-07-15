import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  it("accepts required env", () => {
    const env = validateEnv({
      DATABASE_URL: "postgres://localhost:5432/db",
      JWT_ACCESS_SECRET: "access",
      JWT_REFRESH_SECRET: "refresh",
    });

    expect(env.PORT).toBe("3000");
    expect(env.NODE_ENV).toBe("development");
  });

  it("fails when secrets are missing", () => {
    expect(() => validateEnv({ DATABASE_URL: "postgres://localhost:5432/db" })).toThrow(
      "Missing required environment variable: JWT_ACCESS_SECRET",
    );
  });
});

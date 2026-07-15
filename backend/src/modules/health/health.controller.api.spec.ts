import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Reflector } from "@nestjs/core";
import { DeprecatedRoute } from "../../common/decorators/deprecated.decorator";
import { DeprecationInterceptor } from "../../common/interceptors/deprecation.interceptor";

@Controller("health")
class TestHealthController {
  @Get()
  @DeprecatedRoute({ since: "2026-07-15", alternative: "/api/v1/monitoring/health" })
  check() {
    return { status: "ok" };
  }
}

describe("Health API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestHealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new DeprecationInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns deprecation headers", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.headers.deprecation).toBe("true");
    expect(response.headers.warning).toContain("Deprecated since");
  });
});

import { Controller, Get } from "@nestjs/common";
import { DeprecatedRoute } from "../../common/decorators/deprecated.decorator";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("")
  @DeprecatedRoute({
    since: "2026-07-15",
    alternative: "/api/v1/monitoring/health",
    message: "Use monitoring health endpoint",
  })
  check() {
    return this.healthService.check();
  }
}

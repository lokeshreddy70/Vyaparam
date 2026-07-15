import { SetMetadata } from "@nestjs/common";

export const DEPRECATED_ROUTE_KEY = "deprecated-route";

export type DeprecatedRouteMetadata = {
  since: string;
  sunsetAt?: string;
  alternative?: string;
  message?: string;
};

export const DeprecatedRoute = (metadata: DeprecatedRouteMetadata) =>
  SetMetadata(DEPRECATED_ROUTE_KEY, metadata);

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { BusinessesModule } from "./modules/businesses/businesses.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { RolesModule } from "./modules/roles/roles.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { HealthModule } from "./modules/health/health.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { UnitsModule } from "./modules/units/units.module";
import { ProductsModule } from "./modules/products/products.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { BillingPosModule } from "./modules/billing-pos/billing-pos.module";
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import redisConfig from "./config/redis.config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot({ throttlers: [{ limit: 20, ttl: 60 }] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    BusinessesModule,
    BranchesModule,
    RolesModule,
    PermissionsModule,
    HealthModule,
    CategoriesModule,
    BrandsModule,
    UnitsModule,
    ProductsModule,
    WarehousesModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    BillingPosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}

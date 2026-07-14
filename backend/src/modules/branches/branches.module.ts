import { Module } from "@nestjs/common";
import { BranchesService } from "./branches.service";
import { BranchesController } from "./branches.controller";
import { BranchesRepository } from "./branches.repository";

@Module({ controllers: [BranchesController], providers: [BranchesService, BranchesRepository], exports: [BranchesService] })
export class BranchesModule {}

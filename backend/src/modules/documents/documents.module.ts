import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsPublicController } from "./documents.public.controller";
import { DocumentsRepository } from "./documents.repository";
import { DocumentsService } from "./documents.service";
import { LocalStorageProvider } from "./storage/local-storage.provider";

@Module({
  controllers: [DocumentsController, DocumentsPublicController],
  providers: [DocumentsService, DocumentsRepository, LocalStorageProvider],
  exports: [DocumentsService],
})
export class DocumentsModule {}

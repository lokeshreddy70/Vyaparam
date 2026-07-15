import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { DocumentsService } from "./documents.service";

@ApiTags("documents-public")
@Controller("documents/public")
export class DocumentsPublicController {
  constructor(private readonly service: DocumentsService) {}

  @Get("signed/:token")
  async signedDownload(@Param("token") token: string, @Res() res: Response) {
    const data = await this.service.downloadBySignedToken(token);
    res.setHeader("Content-Type", data.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${data.fileName}\"`);
    data.stream.getStream().pipe(res);
  }
}

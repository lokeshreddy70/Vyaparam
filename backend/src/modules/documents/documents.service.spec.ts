import { BadRequestException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";

describe("DocumentsService", () => {
  const repository: any = {};
  const localStorageProvider: any = {};

  const service = new DocumentsService(repository, localStorageProvider);

  it("validates missing file", async () => {
    await expect(
      service.uploadFile(
        "b1",
        "u1",
        undefined as any,
        { category: "DOCUMENT", visibility: "PRIVATE" } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("validates malformed file payload", async () => {
    await expect(
      service.uploadFile(
        "b1",
        "u1",
        { size: 1 } as any,
        { category: "DOCUMENT", visibility: "PRIVATE" } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

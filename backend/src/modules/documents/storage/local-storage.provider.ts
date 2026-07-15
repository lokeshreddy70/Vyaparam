import { Injectable } from "@nestjs/common";
import { StorageProvider } from "@prisma/client";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import {
  FileStorageProvider,
  StorageDeleteInput,
  StorageGetInput,
  StoragePutInput,
  StorageReadResult,
  StorageResult,
} from "./storage-provider.interface";

@Injectable()
export class LocalStorageProvider implements FileStorageProvider {
  readonly provider = StorageProvider.LOCAL;

  private readonly rootDir = join(process.cwd(), "uploads", "files");

  private absolute(objectKey: string) {
    return join(this.rootDir, objectKey);
  }

  async putObject(input: StoragePutInput): Promise<StorageResult> {
    const filePath = this.absolute(input.objectKey);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, input.buffer);
    return {
      objectKey: input.objectKey.replace(/\\/g, "/"),
      provider: StorageProvider.LOCAL,
    };
  }

  async getObject(input: StorageGetInput): Promise<StorageReadResult> {
    const filePath = this.absolute(input.objectKey);
    const buffer = await fs.readFile(filePath);
    return { buffer };
  }

  async deleteObject(input: StorageDeleteInput): Promise<void> {
    const filePath = this.absolute(input.objectKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore missing file cleanup errors
    }
  }
}

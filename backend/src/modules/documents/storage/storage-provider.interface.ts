import { StorageProvider } from "@prisma/client";

export interface StoragePutInput {
  businessId: string;
  objectKey: string;
  buffer: Buffer;
  contentType: string;
}

export interface StorageGetInput {
  businessId: string;
  objectKey: string;
}

export interface StorageDeleteInput {
  businessId: string;
  objectKey: string;
}

export interface StorageResult {
  objectKey: string;
  bucket?: string;
  provider: StorageProvider;
}

export interface StorageReadResult {
  buffer: Buffer;
  contentType?: string;
}

export interface FileStorageProvider {
  readonly provider: StorageProvider;
  putObject(input: StoragePutInput): Promise<StorageResult>;
  getObject(input: StorageGetInput): Promise<StorageReadResult>;
  deleteObject(input: StorageDeleteInput): Promise<void>;
}

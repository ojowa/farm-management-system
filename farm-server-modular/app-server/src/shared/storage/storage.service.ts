import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync, promises as fsPromises } from 'fs';
import { dirname, extname, join, normalize } from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StorageSettingsService } from './storage-settings.service';
import type { StorageConfig, StorageDriver } from './storage.types';

export interface StoredObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

/** Thrown when an object key is not present in the backing store. */
export class StorageObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object not found: ${key}`);
    this.name = 'StorageObjectNotFoundError';
  }
}

/** Build a collision-free, org-scoped object key for a document upload. */
export function buildDocumentKey(organizationId: string, originalName: string): string {
  const ext = extname(originalName || '').toLowerCase();
  return `documents/${organizationId || 'shared'}/${randomUUID()}${ext}`;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private cached?: { key: string; client: S3Client };

  constructor(private readonly settings: StorageSettingsService) {}

  /** Effective driver for the current configuration. */
  async getDriver(): Promise<StorageDriver> {
    return (await this.settings.getConfig()).driver;
  }

  private s3(config: StorageConfig): S3Client {
    if (!config.bucket) {
      throw new Error('S3 bucket is not configured (required for the s3 storage driver)');
    }
    const key = [
      config.endpoint || '',
      config.region,
      config.accessKeyId || '',
      config.secretAccessKey || '',
      String(config.forcePathStyle),
    ].join('|');
    if (!this.cached || this.cached.key !== key) {
      this.cached = {
        key,
        client: new S3Client({
          region: config.region,
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
          credentials:
            config.accessKeyId && config.secretAccessKey
              ? {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretAccessKey,
                }
              : undefined,
        }),
      };
    }
    return this.cached.client;
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<void> {
    const config = await this.settings.getConfig();
    if (config.driver === 's3') {
      await this.s3(config).send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType || 'application/octet-stream',
        }),
      );
      return;
    }

    const filePath = this.localPath(config, key);
    await fsPromises.mkdir(dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, body);
  }

  async download(key: string): Promise<StoredObject> {
    const config = await this.settings.getConfig();
    if (config.driver === 's3') {
      try {
        const res = await this.s3(config).send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        if (!res.Body) throw new StorageObjectNotFoundError(key);
        return {
          stream: res.Body as unknown as Readable,
          contentType: res.ContentType,
          contentLength: res.ContentLength,
        };
      } catch (err: any) {
        if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
          throw new StorageObjectNotFoundError(key);
        }
        throw err;
      }
    }

    const filePath = this.localPath(config, key);
    if (!existsSync(filePath)) throw new StorageObjectNotFoundError(key);
    return { stream: createReadStream(filePath) };
  }

  async delete(key: string): Promise<void> {
    const config = await this.settings.getConfig();
    if (config.driver === 's3') {
      await this.s3(config).send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      return;
    }
    await fsPromises.unlink(this.localPath(config, key)).catch((err: any) => {
      if (err?.code !== 'ENOENT') throw err;
    });
  }

  private localPath(config: StorageConfig, key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');
    return join(config.localDir, safe);
  }
}

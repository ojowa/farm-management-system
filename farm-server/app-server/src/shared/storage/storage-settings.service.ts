import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@farm/database';
import {
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import {
  SECRET_UNCHANGED,
  STORAGE_SETTINGS_KEY,
  StorageConfig,
  StorageDriver,
  StorageSettingsInput,
  StorageSettingsPublic,
} from './storage.types';

function firstDefined(...values: Array<string | undefined | null>): string | undefined {
  return values.find((v): v is string => v !== undefined && v !== null && v !== '');
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Resolves the object-storage configuration for the whole platform.
 *
 * Settings are stored in the `PlatformConfig` table under the single key
 * `storage.settings` (a JSON blob) and can be edited from the console. Any
 * field left blank falls back to the matching environment variable so
 * existing deployments keep working without a DB entry.
 */
@Injectable()
export class StorageSettingsService {
  private readonly logger = new Logger(StorageSettingsService.name);

  private async readStored(): Promise<Record<string, unknown>> {
    try {
      const row = await prisma.platformConfig.findUnique({ where: { key: STORAGE_SETTINGS_KEY } });
      const value = row?.value;
      return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    } catch (err: any) {
      this.logger.warn(`Failed to read storage settings: ${err?.message}`);
      return {};
    }
  }

  private resolve(stored: Record<string, unknown>): StorageConfig {
    const bucket = firstDefined(
      asString(stored.bucket),
      process.env.S3_BUCKET,
      process.env.R2_BUCKET,
      process.env.AWS_S3_BUCKET,
    );
    const explicitDriver = firstDefined(
      asString(stored.driver),
      process.env.STORAGE_DRIVER,
    )?.toLowerCase();
    const driver: StorageDriver =
      explicitDriver === 's3' || explicitDriver === 'local'
        ? (explicitDriver as StorageDriver)
        : bucket
          ? 's3'
          : 'local';

    const storedForcePathStyle =
      typeof stored.forcePathStyle === 'boolean' ? (stored.forcePathStyle as boolean) : undefined;

    const endpoint = firstDefined(
      asString(stored.endpoint),
      process.env.S3_ENDPOINT,
      process.env.R2_ENDPOINT,
    );
    const localDir =
      process.env.UPLOAD_DIR ||
      (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
        ? join('/tmp', 'uploads')
        : join(process.cwd(), 'uploads'));

    return {
      driver,
      bucket: bucket || '',
      region:
        firstDefined(
          asString(stored.region),
          process.env.S3_REGION,
          process.env.AWS_REGION,
          process.env.R2_REGION,
        ) || (endpoint ? 'auto' : 'us-east-1'),
      endpoint,
      accessKeyId: firstDefined(
        asString(stored.accessKeyId),
        process.env.S3_ACCESS_KEY_ID,
        process.env.R2_ACCESS_KEY_ID,
        process.env.AWS_ACCESS_KEY_ID,
      ),
      secretAccessKey: firstDefined(
        asString(stored.secretAccessKey),
        process.env.S3_SECRET_ACCESS_KEY,
        process.env.R2_SECRET_ACCESS_KEY,
        process.env.AWS_SECRET_ACCESS_KEY,
      ),
      forcePathStyle:
        storedForcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true',
      localDir,
    };
  }

  /** Resolved runtime config used by StorageService. */
  async getConfig(): Promise<StorageConfig> {
    return this.resolve(await this.readStored());
  }

  /** Masked projection for the console. */
  async getPublicSettings(): Promise<StorageSettingsPublic> {
    const stored = await this.readStored();
    const config = this.resolve(stored);
    return {
      driver: config.driver,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint || '',
      accessKeyId: config.accessKeyId || '',
      hasSecretAccessKey: !!config.secretAccessKey,
      forcePathStyle: config.forcePathStyle,
      source: Object.keys(stored).length > 0 ? 'database' : 'environment',
    };
  }

  /** Merge the incoming settings over what is stored and persist. */
  async updateSettings(
    input: StorageSettingsInput,
    auditUserId?: string,
  ): Promise<StorageSettingsPublic> {
    const stored = { ...(await this.readStored()) };

    const assignString = (field: keyof StorageSettingsInput) => {
      if (input[field] === undefined) return;
      const val = asString(input[field]);
      if (val === undefined) delete stored[field as string];
      else stored[field as string] = val;
    };

    if (input.driver !== undefined) {
      const driver = asString(input.driver);
      if (driver === 's3' || driver === 'local') stored.driver = driver;
      else delete stored.driver;
    }
    assignString('bucket');
    assignString('region');
    assignString('endpoint');
    assignString('accessKeyId');

    // Secret is write-only: keep the previous value unless a new one is supplied.
    if (input.secretAccessKey !== undefined && input.secretAccessKey !== SECRET_UNCHANGED) {
      const secret = asString(input.secretAccessKey);
      if (secret === undefined) delete stored.secretAccessKey;
      else stored.secretAccessKey = secret;
    }

    if (input.forcePathStyle !== undefined) {
      stored.forcePathStyle = input.forcePathStyle === true || String(input.forcePathStyle) === 'true';
    }

    await prisma.platformConfig.upsert({
      where: { key: STORAGE_SETTINGS_KEY },
      update: { value: stored as any },
      create: {
        key: STORAGE_SETTINGS_KEY,
        value: stored as any,
        category: 'storage',
        description: 'Object storage (S3/R2) configuration',
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: auditUserId || null,
          action: 'config.storage.update',
          entity: 'PlatformConfig',
          entityId: STORAGE_SETTINGS_KEY,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write storage audit log: ${err?.message}`);
    }

    return this.getPublicSettings();
  }

  /**
   * Verify the supplied/effective configuration by touching the backend
   * (HeadBucket for S3, a mkdir for local). Never throws — returns a result.
   */
  async testConnection(
    input?: StorageSettingsInput,
  ): Promise<{ ok: boolean; driver: StorageDriver; message: string; details?: unknown }> {
    // Test the config as it would be after applying the (unsaved) input.
    const stored = await this.readStored();
    const patch: Record<string, unknown> = { ...(input || {}) };
    if (patch.secretAccessKey === SECRET_UNCHANGED) delete patch.secretAccessKey;
    const config = this.resolve({ ...stored, ...patch });
    const bucket = config.bucket;

    if (config.driver === 'local') {
      try {
        await fsPromises.mkdir(config.localDir, { recursive: true });
        await fsPromises.access(config.localDir);
        return { ok: true, driver: 'local', message: `Local directory is writable: ${config.localDir}` };
      } catch (err: any) {
        return { ok: false, driver: 'local', message: `Local directory is not writable: ${err?.message}` };
      }
    }

    if (!bucket) {
      return { ok: false, driver: 's3', message: 'Bucket name is required for the S3 driver' };
    }

    try {
      const client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials:
          config.accessKeyId && config.secretAccessKey
            ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
            : undefined,
      });
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ok: true, driver: 's3', message: `Successfully reached bucket "${bucket}"` };
    } catch (err: any) {
      const message =
        err?.name === 'NotFound'
          ? `Bucket "${bucket}" was not found`
          : err?.message || 'Connection failed';
      return {
        ok: false,
        driver: 's3',
        message,
        details: { name: err?.name, statusCode: err?.$metadata?.httpStatusCode },
      };
    }
  }
}

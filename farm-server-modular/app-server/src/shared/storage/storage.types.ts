export type StorageDriver = 's3' | 'local';

/** Fully resolved storage configuration (DB overrides, then env, then defaults). */
export interface StorageConfig {
  driver: StorageDriver;
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  localDir: string;
}

/** Canonical PlatformConfig key that holds the JSON storage settings blob. */
export const STORAGE_SETTINGS_KEY = 'storage.settings';

/**
 * Fields the console may send. `secretAccessKey` is write-only: omit it (or
 * send the UNCHANGED sentinel) to keep the previously stored value.
 */
export interface StorageSettingsInput {
  driver?: StorageDriver;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

/** Safe projection returned to the console (never contains the secret). */
export interface StorageSettingsPublic {
  driver: StorageDriver;
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  hasSecretAccessKey: boolean;
  forcePathStyle: boolean;
  source: 'database' | 'environment';
}

export const SECRET_UNCHANGED = '__UNCHANGED__';

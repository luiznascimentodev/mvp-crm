import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../storage/storage.service';
import type { EnvConfig } from '../../common/env/env.validation';

// Mock do AWS SDK
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockGetSignedUrl = vi.hoisted(() =>
  vi.fn().mockResolvedValue('https://minio.local/signed-url'),
);

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = mockSend;
  }
  class PutObjectCommand {}
  class GetObjectCommand {}
  class DeleteObjectCommand {}
  class HeadObjectCommand {}
  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

function makeConfig(): ConfigService<EnvConfig, true> {
  return {
    get: vi.fn((key: string) => {
      const defaults: Record<string, string> = {
        STORAGE_BUCKET: 'orbit-crm',
        STORAGE_ENDPOINT: 'http://localhost:9000',
        STORAGE_REGION: 'us-east-1',
        STORAGE_ACCESS_KEY: 'minioadmin',
        STORAGE_SECRET_KEY: 'minioadmin',
      };
      return defaults[key];
    }),
  } as unknown as ConfigService<EnvConfig, true>;
}

describe('Security: File Upload Validation', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorageService(makeConfig());
  });

  it('Rejeita upload de arquivo .exe (application/octet-stream)', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'application/octet-stream',
        1024,
        'malware.exe',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Rejeita upload de arquivo com MIME type de script PHP (application/x-php)', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'application/x-php',
        1024,
        'shell.php',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Rejeita upload de script JavaScript disfarçado', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'application/javascript',
        1024,
        'malicious.js',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Rejeita arquivo maior que 10MB', async () => {
    const elevenMB = 11 * 1024 * 1024;
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'image/jpeg',
        elevenMB,
        'huge-image.jpg',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Rejeita arquivo com MIME type text/html (potencial XSS)', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'text/html',
        512,
        'xss.html',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('Permite upload de PDF legítimo', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'application/pdf',
        1024 * 1024,
        'contrato.pdf',
      ),
    ).resolves.toBeDefined();
  });

  it('Permite upload de imagem JPEG legítima', async () => {
    await expect(
      service.generatePresignedUploadUrl(
        'tenant-1',
        'contact',
        'image/jpeg',
        500 * 1024,
        'foto.jpg',
      ),
    ).resolves.toBeDefined();
  });
});

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service';
import type { EnvConfig } from '../common/env/env.validation';

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

function makeConfig(
  overrides: Record<string, string> = {},
): ConfigService<EnvConfig, true> {
  return {
    get: vi.fn((key: string) => {
      const defaults: Record<string, string> = {
        STORAGE_BUCKET: 'orbit-crm',
        STORAGE_ENDPOINT: 'http://localhost:9000',
        STORAGE_REGION: 'us-east-1',
        STORAGE_ACCESS_KEY: 'minioadmin',
        STORAGE_SECRET_KEY: 'minioadmin',
        ...overrides,
      };
      return defaults[key];
    }),
  } as unknown as ConfigService<EnvConfig, true>;
}

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService(makeConfig());
  });

  describe('generatePresignedUploadUrl', () => {
    it('deve gerar URL de upload para MIME type válido', async () => {
      const result = await service.generatePresignedUploadUrl(
        'tenant-1',
        'lead',
        'application/pdf',
        1024 * 50,
        'proposta.pdf',
      );
      expect(result.uploadUrl).toBe('https://minio.local/signed-url');
      expect(result.key).toMatch(/^tenant-1\/lead\/.+\.pdf$/);
      expect(result.expiresIn).toBe(900);
    });

    it('deve rejeitar MIME type não permitido', async () => {
      await expect(
        service.generatePresignedUploadUrl(
          'tenant-1',
          'lead',
          'application/exe',
          1000,
          'virus.exe',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar arquivo maior que 10MB', async () => {
      await expect(
        service.generatePresignedUploadUrl(
          'tenant-1',
          'lead',
          'image/jpeg',
          11 * 1024 * 1024,
          'foto.jpg',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve gerar URL de download', async () => {
      const result = await service.generatePresignedDownloadUrl(
        'tenant-1/lead/uuid.pdf',
      );
      expect(result.downloadUrl).toBe('https://minio.local/signed-url');
      expect(result.expiresIn).toBe(3600);
    });
  });
});

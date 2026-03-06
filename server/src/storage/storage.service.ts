import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type { EnvConfig } from '../common/env/env.validation';

// Tipos MIME permitidos para upload
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly enabled: boolean;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const endpoint = config.get('STORAGE_ENDPOINT', { infer: true });
    const accessKey = config.get('STORAGE_ACCESS_KEY', { infer: true });
    const secretKey = config.get('STORAGE_SECRET_KEY', { infer: true });

    this.bucket = config.get('STORAGE_BUCKET');
    this.enabled = !!(endpoint && accessKey && secretKey);

    if (this.enabled) {
      this.s3 = new S3Client({
        endpoint,
        region: config.get('STORAGE_REGION'),
        credentials: {
          accessKeyId: accessKey!,
          secretAccessKey: secretKey!,
        },
        forcePathStyle: true, // Necessario para MinIO
      });
    } else {
      this.s3 = null;
      this.logger.warn(
        'Storage nao configurado (STORAGE_ENDPOINT/ACCESS_KEY/SECRET_KEY ausentes) — endpoints de upload retornarao 503',
      );
    }
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.s3) {
      throw new ServiceUnavailableException(
        'Storage nao configurado neste ambiente. Configure STORAGE_ENDPOINT, STORAGE_ACCESS_KEY e STORAGE_SECRET_KEY.',
      );
    }
  }

  /**
   * Gera uma URL pre-assinada para upload seguro direto ao MinIO/S3.
   * O arquivo NUNCA passa pelo servidor NestJS.
   */
  async generatePresignedUploadUrl(
    tenantId: string,
    entityType: string,
    mimeType: string,
    fileSize: number,
    originalName: string,
  ): Promise<PresignedUploadResult> {
    this.assertEnabled();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${mimeType}`,
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `${tenantId}/${entityType}/${uuidv4()}.${ext}`;
    const expiresIn = 15 * 60; // 15 minutos

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn });
    return { uploadUrl, key, expiresIn };
  }

  /**
   * Gera URL pré-assinada para download temporário.
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<PresignedDownloadResult> {
    this.assertEnabled();
    // Verificar que o arquivo existe antes de assinar
    await this.s3!.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const downloadUrl = await getSignedUrl(this.s3!, command, { expiresIn });
    return { downloadUrl, expiresIn };
  }

  /**
   * Remove arquivo do storage permanentemente.
   */
  async deleteFile(key: string): Promise<void> {
    this.assertEnabled();
    await this.s3!.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

class RequestUploadUrlDto {
  @IsString()
  entityType!: string;

  @IsIn(['deal', 'contact', 'lead'])
  entityTypeValidated?: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize!: number;

  @IsString()
  fileName!: string;
}

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Gerar URL pré-assinada para upload direto ao S3' })
  @ApiResponse({ status: 201, description: 'URL gerada com sucesso' })
  async requestUploadUrl(
    @Body() dto: RequestUploadUrlDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.storage.generatePresignedUploadUrl(
      req.user.tenantId,
      dto.entityType,
      dto.mimeType,
      dto.fileSize,
      dto.fileName,
    );
  }

  @Get('download-url/:attachmentId')
  @ApiOperation({ summary: 'Gerar URL temporária para download de anexo' })
  @ApiResponse({ status: 200, description: 'URL de download gerada' })
  async getDownloadUrl(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req: { user: AuthUser },
  ) {
    const attachment = await this.prisma.attachment.findFirstOrThrow({
      where: { id: attachmentId, tenantId: req.user.tenantId },
    });
    return this.storage.generatePresignedDownloadUrl(attachment.s3Key);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover anexo (storage + banco)' })
  @ApiResponse({ status: 204, description: 'Anexo removido' })
  async deleteAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req: { user: AuthUser },
  ) {
    const attachment = await this.prisma.attachment.findFirstOrThrow({
      where: { id: attachmentId, tenantId: req.user.tenantId },
    });
    await this.storage.deleteFile(attachment.s3Key);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}

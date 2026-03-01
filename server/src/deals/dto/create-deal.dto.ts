import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { DealStage } from '@prisma/client';

export class CreateDealDto {
  @ApiProperty({ example: 'Proposta Acme Corp', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'Expansão de licença anual' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value!: number;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: DealStage, example: DealStage.PROSPECTING })
  @IsEnum(DealStage)
  stage!: DealStage;

  @ApiPropertyOptional({ example: 60, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('all')
  contactId!: string;
}

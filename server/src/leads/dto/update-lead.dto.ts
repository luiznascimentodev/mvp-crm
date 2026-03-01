import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MaxLength,
} from 'class-validator';
import {
  LEAD_STAGES,
  LEAD_SOURCES,
  type LeadStage,
  type LeadSource,
} from './create-lead.dto';

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ enum: LEAD_SOURCES })
  @IsEnum(LEAD_SOURCES)
  @IsOptional()
  source?: LeadSource;

  @ApiPropertyOptional({ enum: LEAD_STAGES })
  @IsEnum(LEAD_STAGES)
  @IsOptional()
  status?: LeadStage;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

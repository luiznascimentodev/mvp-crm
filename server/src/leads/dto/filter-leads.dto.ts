import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { LEAD_STAGES, type LeadStage } from './create-lead.dto';

export class FilterLeadsDto {
  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: LEAD_STAGES })
  @IsEnum(LEAD_STAGES)
  @IsOptional()
  status?: LeadStage;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc';
}

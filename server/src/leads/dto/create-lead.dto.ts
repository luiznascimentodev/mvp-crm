import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MaxLength,
} from 'class-validator';

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = [
  'website',
  'referral',
  'cold_call',
  'linkedin',
  'event',
  'email_campaign',
  'whatsapp',
  'indication',
  'other',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export class CreateLeadDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'joao@exemplo.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+55 11 99999-9999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ enum: LEAD_SOURCES, example: 'website' })
  @IsEnum(LEAD_SOURCES)
  @IsOptional()
  source?: LeadSource;

  @ApiPropertyOptional({ enum: LEAD_STAGES, default: 'new' })
  @IsEnum(LEAD_STAGES)
  @IsOptional()
  status?: LeadStage;

  @ApiPropertyOptional({ example: 'Lead veio via formulário de contato' })
  @IsString()
  @IsOptional()
  notes?: string;
}

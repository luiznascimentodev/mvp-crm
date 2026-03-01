import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LEAD_STAGES, type LeadStage } from './create-lead.dto';

export class MoveLeadStageDto {
  @ApiProperty({ enum: LEAD_STAGES })
  @IsEnum(LEAD_STAGES)
  status!: LeadStage;
}

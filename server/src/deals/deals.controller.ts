import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DealStage } from '@prisma/client';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, FilterDealsDto } from './dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Audit } from '../common/decorators/audit.decorator';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

class MoveStageBodyDto {
  @IsEnum(DealStage)
  stage!: DealStage;
}

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Audit('Deal')
  @ApiOperation({ summary: 'Criar novo deal' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateDealDto, @Request() req: { user: AuthUser }) {
    return this.dealsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar deals paginados com filtros' })
  findAll(
    @Query() filters: FilterDealsDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.dealsService.findAll(filters, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um deal por ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.dealsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Audit('Deal')
  @ApiOperation({ summary: 'Atualizar deal' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.dealsService.update(id, dto, req.user);
  }

  @Patch(':id/stage')
  @Audit('Deal')
  @ApiOperation({ summary: 'Mover deal para outro stage (Kanban)' })
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageBodyDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.dealsService.moveStage(id, dto, req.user);
  }

  @Delete(':id')
  @Audit('Deal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover deal (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.dealsService.remove(id, req.user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  FilterLeadsDto,
  MoveLeadStageDto,
  UpdateLeadDto,
} from './dto';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: AuthUser;
}

// ── Rota pública — captura de lead via formulário externo ──────────────────
@ApiTags('leads-public')
@Controller('leads/public')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post(':tenantId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Captura pública de lead (sem autenticação)' })
  @ApiResponse({ status: 201, description: 'Lead registrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Workspace não encontrado' })
  createPublic(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.createPublic(tenantId, dto);
  }
}

// ── Rotas protegidas ───────────────────────────────────────────────────────
@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo lead' })
  @ApiResponse({ status: 201, description: 'Lead criado com sucesso' })
  create(@Body() dto: CreateLeadDto, @Request() req: RequestWithUser) {
    return this.leadsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar leads (paginado + filtros)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de leads' })
  findAll(@Query() filterDto: FilterLeadsDto, @Request() req: RequestWithUser) {
    return this.leadsService.findAll(filterDto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lead por ID' })
  @ApiResponse({ status: 200, description: 'Dados do lead' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.leadsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados do lead' })
  @ApiResponse({ status: 200, description: 'Lead atualizado' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @Request() req: RequestWithUser,
  ) {
    return this.leadsService.update(id, dto, req.user);
  }

  @Patch(':id/move-stage')
  @ApiOperation({ summary: 'Mover lead para outro estágio (drag & drop)' })
  @ApiResponse({ status: 200, description: 'Estágio atualizado' })
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveLeadStageDto,
    @Request() req: RequestWithUser,
  ) {
    return this.leadsService.moveStage(id, dto, req.user);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Converter lead em contato' })
  @ApiResponse({ status: 201, description: 'Contato criado' })
  convertToContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.leadsService.convertToContact(id, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover lead (soft-delete)' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.leadsService.remove(id, req.user);
  }
}

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
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { RolesGuard } from '../common/guards/roles.guard';
import { ContactsService, AuthenticatedUser } from './contacts.service';
import { CreateContactDto, FilterContactsDto, UpdateContactDto } from './dto';

interface RequestWithUser {
  user: AuthenticatedUser;
}
@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Audit('Contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo contato' })
  @ApiResponse({ status: 201, description: 'Contato criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado neste tenant' })
  create(@Body() dto: CreateContactDto, @Request() req: RequestWithUser) {
    return this.contactsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contatos (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de contatos' })
  findAll(
    @Query() filterDto: FilterContactsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.contactsService.findAll(filterDto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contato por ID' })
  @ApiResponse({ status: 200, description: 'Dados do contato' })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.contactsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Audit('Contact')
  @Roles(Role.ADMIN, Role.OWNER, Role.MEMBER)
  @ApiOperation({ summary: 'Atualizar contato' })
  @ApiResponse({ status: 200, description: 'Contato atualizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @Request() req: RequestWithUser,
  ) {
    return this.contactsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Audit('Contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar contato (soft delete)' })
  @ApiResponse({ status: 204, description: 'Contato removido' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.contactsService.remove(id, req.user);
  }
}

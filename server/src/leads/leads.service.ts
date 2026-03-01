import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  FilterLeadsDto,
  MoveLeadStageDto,
} from './dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private ownerSelect = { select: { id: true, name: true, email: true } };

  // ── Criar lead (usuário autenticado) ───────────────────────────────────────
  async create(dto: CreateLeadDto, user: AuthUser) {
    return this.prisma.lead.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.userId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        source: dto.source,
        status: dto.status ?? 'new',
        notes: dto.notes,
      },
      include: { owner: this.ownerSelect },
    });
  }

  // ── Captura pública (formulário externo, sem auth) ─────────────────────────
  async createPublic(tenantId: string, dto: CreateLeadDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Workspace não encontrado.');
    return this.prisma.lead.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        source: dto.source ?? 'website',
        status: 'new',
        notes: dto.notes,
      },
    });
  }

  // ── Listar todos (paginado, filtrável) ─────────────────────────────────────
  async findAll(filters: FilterLeadsDto, user: AuthUser) {
    const {
      page = 1,
      limit = 200,
      search,
      status,
      sortBy = 'createdAt',
      order = 'desc',
    } = filters;

    const where: Prisma.LeadWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };

    // MEMBER só vê seus próprios leads
    if (user.role === Role.MEMBER) {
      where.ownerId = user.userId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: order },
        include: {
          owner: this.ownerSelect,
          _count: { select: { activities: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  // ── Buscar lead por ID ─────────────────────────────────────────────────────
  async findOne(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        owner: this.ownerSelect,
        activities: {
          orderBy: { scheduledAt: 'asc' },
          take: 20,
        },
        _count: { select: { activities: true } },
      },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} não encontrado.`);
    return lead;
  }

  // ── Atualizar lead ─────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateLeadDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.lead.update({
      where: { id },
      data: { ...dto },
      include: { owner: this.ownerSelect },
    });
  }

  // ── Mover estágio (drag & drop do Kanban) ──────────────────────────────────
  async moveStage(id: string, dto: MoveLeadStageDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.lead.update({
      where: { id },
      data: { status: dto.status },
      include: { owner: this.ownerSelect },
    });
  }

  // ── Converter lead em contato (ao ganhar negócio) ──────────────────────────
  async convertToContact(id: string, user: AuthUser) {
    const lead = await this.findOne(id, user);

    const contact = await this.prisma.contact.create({
      data: {
        tenantId: lead.tenantId,
        ownerId: lead.ownerId,
        name: lead.name,
        email: lead.email ?? '',
        phone: lead.phone,
        company: lead.company,
        notes: lead.notes,
      },
    });

    // Reatribui atividades do lead para o novo contato
    await this.prisma.activity.updateMany({
      where: { leadId: id, tenantId: user.tenantId },
      data: { leadId: null, contactId: contact.id },
    });

    // Marca lead como ganho
    await this.prisma.lead.update({
      where: { id },
      data: { status: 'won' },
    });

    return contact;
  }

  // ── Soft-delete ────────────────────────────────────────────────────────────
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

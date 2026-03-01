import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DealStage, Prisma } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import type { CreateDealDto, UpdateDealDto, FilterDealsDto } from './dto';

export interface MoveStageDto {
  stage: DealStage;
}

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDealDto, user: AuthUser) {
    // Validar que o contact pertence ao mesmo tenant
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!contact) {
      throw new NotFoundException(
        `Contato ${dto.contactId} não encontrado neste tenant.`,
      );
    }

    return this.prisma.deal.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.userId,
        contactId: dto.contactId,
        title: dto.title,
        description: dto.description,
        value: dto.value,
        currency: dto.currency ?? 'BRL',
        stage: dto.stage,
        probability: dto.probability ?? 0,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : null,
      },
    });
  }

  async findAll(filters: FilterDealsDto, user: AuthUser) {
    const {
      page = 1,
      limit = 20,
      search,
      stage,
      sortBy = 'createdAt',
      order = 'desc',
    } = filters;

    const where: Prisma.DealWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };

    // MEMBER vê apenas seus deals
    if (user.role === Role.MEMBER) {
      where.ownerId = user.userId;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (stage) {
      where.stage = stage;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          contact: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: AuthUser) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} não encontrado.`);
    }

    if (user.role === Role.MEMBER && deal.ownerId !== user.userId) {
      throw new ForbiddenException('Acesso negado a este deal.');
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto, user: AuthUser) {
    const deal = await this.findOne(id, user);

    // MEMBER só pode editar seus próprios deals
    if (user.role === Role.MEMBER && deal.ownerId !== user.userId) {
      throw new ForbiddenException('Você não pode editar este deal.');
    }

    // Validar contactId se estiver sendo alterado
    if (dto.contactId && dto.contactId !== deal.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: dto.contactId,
          tenantId: user.tenantId,
          deletedAt: null,
        },
      });
      if (!contact) {
        throw new NotFoundException(
          `Contato ${dto.contactId} não encontrado neste tenant.`,
        );
      }
    }

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.stage && { stage: dto.stage }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.expectedCloseDate !== undefined && {
          expectedCloseDate: dto.expectedCloseDate
            ? new Date(dto.expectedCloseDate)
            : null,
        }),
        ...(dto.contactId && { contactId: dto.contactId }),
      },
    });
  }

  async moveStage(id: string, dto: MoveStageDto, user: AuthUser) {
    const deal = await this.findOne(id, user);

    if (user.role === Role.MEMBER && deal.ownerId !== user.userId) {
      throw new ForbiddenException('Você não pode mover este deal.');
    }

    const closedStages: DealStage[] = [
      DealStage.CLOSED_WON,
      DealStage.CLOSED_LOST,
    ];
    const isClosing = closedStages.includes(dto.stage);

    return this.prisma.deal.update({
      where: { id },
      data: {
        stage: dto.stage,
        probability:
          dto.stage === DealStage.CLOSED_WON
            ? 100
            : dto.stage === DealStage.CLOSED_LOST
              ? 0
              : deal.probability,
        isActive: !isClosing,
        closedAt: isClosing ? new Date() : null,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    const deal = await this.findOne(id, user);

    if (user.role === Role.MEMBER && deal.ownerId !== user.userId) {
      throw new ForbiddenException('Você não pode remover este deal.');
    }

    if (deal.deletedAt !== null) {
      throw new ConflictException('Deal já foi removido.');
    }

    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

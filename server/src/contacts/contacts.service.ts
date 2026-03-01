import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, FilterContactsDto, UpdateContactDto } from './dto';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string;
  role: Role;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto, user: AuthenticatedUser) {
    const existing = await this.prisma.contact.findUnique({
      where: {
        tenantId_email: { tenantId: user.tenantId, email: dto.email },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A contact with this email already exists in this tenant',
      );
    }

    return this.prisma.contact.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
        ownerId: user.userId,
      },
    });
  }

  async findAll(filterDto: FilterContactsDto, user: AuthenticatedUser) {
    const {
      page = 1,
      limit = 20,
      search,
      company,
      ownerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const where: Prisma.ContactWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };

    // MEMBER só vê seus próprios contatos
    if (user.role === Role.MEMBER) {
      where.ownerId = user.userId;
    } else if (ownerId) {
      // OWNER/ADMIN podem filtrar por vendedor específico
      where.ownerId = ownerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    const allowedSortFields = [
      'name',
      'email',
      'company',
      'createdAt',
      'updatedAt',
    ];
    const orderField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderField]: sortOrder },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact || contact.tenantId !== user.tenantId || contact.deletedAt) {
      throw new NotFoundException(`Contact not found`);
    }

    if (user.role === Role.MEMBER && contact.ownerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this contact',
      );
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto, user: AuthenticatedUser) {
    const contact = await this.findOne(id, user);

    if (user.role === Role.MEMBER && contact.ownerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to update this contact',
      );
    }

    return this.prisma.contact.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const contact = await this.findOne(id, user);

    if (user.role === Role.MEMBER && contact.ownerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this contact',
      );
    }

    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

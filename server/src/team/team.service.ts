import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { EnvConfig } from '../common/env/env.validation';
import { Role } from '../common/enums/role.enum';
import { MAIL_QUEUE } from '../queues/queues.module';
import {
  SEND_INVITE_JOB,
  SendInvitePayload,
} from '../queues/processors/mail.processor';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InviteStatus } from '@prisma/client';

const INVITE_EXPIRES_DAYS = 7;

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Convites
  // ──────────────────────────────────────────────────────────────────

  async inviteMember(
    tenantId: string,
    invitedById: string,
    dto: InviteMemberDto,
  ) {
    const { email, role = Role.MEMBER } = dto;

    // OWNER não pode ser convidado como papel
    if (role === Role.OWNER) {
      throw new ForbiddenException('Não é possível convidar alguém como OWNER');
    }

    // Verificar se já existe usuário com esse email no tenant
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Já existe um membro com esse email no time',
      );
    }

    // Verificar limite de usuários do tenant
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        maxUsers: true,
        _count: { select: { users: true } },
      },
    });
    if (tenant._count.users >= tenant.maxUsers) {
      throw new BadRequestException(
        `Limite de ${tenant.maxUsers} usuários atingido para este plano`,
      );
    }

    // Expirar convites anteriores pendentes para o mesmo email/tenant
    await this.prisma.teamInvite.updateMany({
      where: { tenantId, email, status: InviteStatus.PENDING },
      data: { status: InviteStatus.EXPIRED },
    });

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRES_DAYS);

    const invite = await this.prisma.teamInvite.create({
      data: {
        tenantId,
        email,
        role,
        invitedById,
        token,
        expiresAt,
      },
      include: { invitedBy: { select: { name: true } } },
    });

    // Enfileirar job de email
    const inviteLink = `${this.config.get('FRONTEND_URL', { infer: true }) ?? 'http://localhost:5173'}/accept-invite/${token}`;
    const payload: SendInvitePayload = {
      email,
      inviteLink,
      inviterName: invite.invitedBy.name,
      tenantName: tenant.name,
      role,
      expiresAt: expiresAt.toLocaleDateString('pt-BR'),
    };
    await this.mailQueue.add(SEND_INVITE_JOB, payload);
    this.logger.log(`Convite criado para ${email} (job enfileirado)`);

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      status: invite.status,
    };
  }

  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
      include: { tenant: { select: { name: true, isActive: true } } },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Convite já foi ${invite.status === InviteStatus.ACCEPTED ? 'aceito' : 'expirado'}`,
      );
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Convite expirado');
    }
    if (!invite.tenant.isActive) {
      throw new BadRequestException('Organização inativa');
    }

    // Verificar se já existe usuário com esse email (pode ter sido criado após convite)
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId: invite.tenantId, email: invite.email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Já existe um usuário com esse email no time',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          tenantId: invite.tenantId,
          email: invite.email,
          name: dto.name,
          role: invite.role as Role,
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true },
      }),
      this.prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ]);

    this.logger.log(
      `Convite aceito: ${invite.email} ingressou no tenant ${invite.tenantId}`,
    );
    return user;
  }

  async listInvites(tenantId: string) {
    return this.prisma.teamInvite.findMany({
      where: { tenantId, status: InviteStatus.PENDING },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMembers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async revokeInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.teamInvite.findFirst({
      where: { id: inviteId, tenantId },
    });
    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        'Apenas convites pendentes podem ser revogados',
      );
    }
    await this.prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.EXPIRED },
    });
    return { message: 'Convite revogado com sucesso' };
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
      select: {
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        tenant: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }
    return invite;
  }
}

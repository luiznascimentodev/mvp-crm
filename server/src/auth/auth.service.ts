import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, tenantId } = registerDto;

    // Verificar se usuário já existe
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash da senha com Argon2
    const passwordHash = await argon2.hash(password);

    // Criar usuário
    const user = await this.prismaService.user.create({
      data: {
        email,
        name,
        tenantId,
        passwordHash,
        role: 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    return user;
  }
}

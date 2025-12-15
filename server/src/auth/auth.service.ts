import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
        role: Role.MEMBER,
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

  async login(loginDto: LoginDto) {
    const { email, password, tenantId } = loginDto;

    // 1. Buscar usuário por email e tenantId
    const user = await this.prismaService.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    // 2. Validar se usuário existe
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Verificar senha com argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Criar payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    // 5. Gerar e retornar token
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }
}

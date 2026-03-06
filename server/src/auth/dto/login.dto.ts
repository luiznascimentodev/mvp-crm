import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'senha123456',
    description: 'User password',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Password cannot be empty' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({
    example: 'minha-empresa',
    description:
      'Workspace slug (e.g. @minha-empresa) — preferred over tenantId',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    example: 'tenant-uuid-here',
    description:
      'Tenant ID for multi-tenancy isolation (legacy — use slug instead)',
  })
  @IsString()
  @IsOptional()
  tenantId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'User password',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @MaxLength(100, { message: 'Password must have at most 100 characters' })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must have at least 2 characters' })
  @MaxLength(100, { message: 'Name must have at most 100 characters' })
  name: string;

  @ApiProperty({
    example: 'tenant-uuid',
    description: 'Tenant ID to associate user with',
  })
  @IsString({ message: 'TenantId must be a string' })
  tenantId: string;
}

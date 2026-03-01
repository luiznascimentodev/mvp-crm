import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class InviteMemberDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role deve ser ADMIN ou MEMBER' })
  role?: Role;
}

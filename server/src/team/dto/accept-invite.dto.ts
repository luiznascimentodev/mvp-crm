import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @MaxLength(72, { message: 'Senha deve ter no máximo 72 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Senha deve conter ao menos uma letra maiúscula, uma minúscula e um número',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

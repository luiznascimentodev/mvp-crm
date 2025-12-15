import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const jwtExpiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ?? '1h';

        if (!jwtSecret) {
          throw new Error(
            'Critical: JWT_SECRET is not defined in environment variables.',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn,
          },
        } as JwtModuleOptions;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

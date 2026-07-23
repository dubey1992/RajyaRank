import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { MfaService } from './mfa.service';
import { SessionService } from './session.service';
import { TrustedDeviceService } from './trusted-device.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, OtpService, MfaService, SessionService, TrustedDeviceService, TokenService],
  exports: [AuthService, OtpService, MfaService, SessionService, TrustedDeviceService, TokenService],
})
export class AuthModule {}

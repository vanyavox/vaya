import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTtl } from '../../common/utils/ttl';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Email уже зарегистрирован' });
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    const accessToken = await this.signAccessToken(user.id, user.email, user.name);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Неверный email или пароль' });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Неверный email или пароль' });
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.name);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Нет refresh-токена' });
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Недействительный refresh-токен' });
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await this.signAccessToken(
      stored.user.id,
      stored.user.email,
      stored.user.name,
    );
    const refreshToken = await this.issueRefreshToken(stored.user.id);

    return {
      user: this.toUserDto(stored.user),
      accessToken,
      refreshToken,
    };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Пользователь не найден' });
    }
    return this.toUserDto(user);
  }

  private async signAccessToken(sub: string, email: string, name: string): Promise<string> {
    return this.jwtService.signAsync({ sub, email, name });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(raw);
    // Sliding idle window: each rotation extends by JWT_REFRESH_TTL from now.
    // Session ends only after that window passes without a refresh.
    const ttl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const expiresAt = new Date(Date.now() + parseTtl(ttl));

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return raw;
  }

  private hashToken(raw: string): string {
    // For refresh tokens we store SHA-256 hash (not argon2 — needs to be searchable)
    const { createHash } = require('crypto');
    return createHash('sha256').update(raw).digest('hex');
  }

  private toUserDto(user: { id: string; email: string; name: string; avatarUrl: string | null; timezone: string; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UsersService {
  private readonly uploadDir = process.env.UPLOAD_DIR ?? 'uploads';

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Пользователь не найден' });
    return this.toDto(user);
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; timezone?: string }) {
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new BadRequestException({ code: 'CONFLICT', message: 'Email уже занят' });
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
    });
    return this.toDto(user);
  }

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Пользователь не найден' });

    const valid = await argon2.verify(user.passwordHash, data.currentPassword);
    if (!valid) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Текущий пароль неверный' });
    }

    if (data.newPassword.length < 8) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Новый пароль должен быть не короче 8 символов' });
    }

    const passwordHash = await argon2.hash(data.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate other sessions
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async setAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Файл не передан' });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Пользователь не найден' });

    // Delete old avatar
    if (user.avatarUrl) {
      this.removeFile(user.avatarUrl);
    }

    const avatarUrl = `/uploads/${file.filename}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return this.toDto(updated);
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Пользователь не найден' });
    if (user.avatarUrl) this.removeFile(user.avatarUrl);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
    return this.toDto(updated);
  }

  private removeFile(url: string) {
    const filename = url.replace('/uploads/', '');
    const filepath = join(process.cwd(), this.uploadDir, filename);
    if (existsSync(filepath)) {
      try { unlinkSync(filepath); } catch { /* ignore */ }
    }
  }

  private toDto(user: { id: string; email: string; name: string; avatarUrl: string | null; timezone: string; createdAt: Date }) {
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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UsersService {
  private readonly uploadDir = process.env.UPLOAD_DIR ?? 'uploads';

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return this.toDto(user);
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; timezone?: string }) {
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new BadRequestException({ code: 'CONFLICT', message: 'Email already in use' });
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

  async setAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'No file' });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

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
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
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

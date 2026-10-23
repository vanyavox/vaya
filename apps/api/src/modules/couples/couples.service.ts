import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class CouplesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCouple(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId },
      include: {
        couple: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'No couple found' });
    }

    return this.toDto(membership.couple, membership.userId);
  }

  async createCouple(userId: string, name?: string) {
    const existing = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (existing) {
      throw new BadRequestException({ code: 'CONFLICT', message: 'Already in a couple' });
    }

    const inviteCode = generateInviteCode();
    const couple = await this.prisma.couple.create({
      data: {
        name: name ?? null,
        inviteCode,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return this.toDto(couple, userId);
  }

  async regenerateInvite(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (!membership) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'No couple found' });
    }

    const inviteCode = generateInviteCode();
    const couple = await this.prisma.couple.update({
      where: { id: membership.coupleId },
      data: { inviteCode },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return this.toDto(couple, userId);
  }

  async joinCouple(userId: string, inviteCode: string) {
    const existing = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (existing) {
      throw new BadRequestException({ code: 'CONFLICT', message: 'Already in a couple' });
    }

    const couple = await this.prisma.couple.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!couple) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invalid invite code' });
    }

    if (couple.members.length >= 2) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Couple is full' });
    }

    const updated = await this.prisma.couple.update({
      where: { id: couple.id },
      data: {
        members: {
          create: { userId, role: 'PARTNER' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return this.toDto(updated, userId);
  }

  async leaveCouple(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (!membership) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'No couple found' });
    }
    await this.prisma.coupleMember.delete({ where: { id: membership.id } });
  }

  private toDto(
    couple: {
      id: string;
      name: string | null;
      inviteCode: string;
      createdAt: Date;
      members: Array<{
        id: string;
        userId: string;
        role: string;
        joinedAt: Date;
        user: { id: string; name: string; avatarUrl: string | null };
      }>;
    },
    currentUserId: string,
  ) {
    return {
      id: couple.id,
      name: couple.name,
      inviteCode: couple.members.find((m) => m.userId === currentUserId)?.role === 'OWNER'
        ? couple.inviteCode
        : undefined,
      createdAt: couple.createdAt.toISOString(),
      members: couple.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }
}

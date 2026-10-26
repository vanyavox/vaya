import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Visibility, Prisma } from '@prisma/client';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, scope: 'mine' | 'personal' | 'shared' | 'all' = 'all') {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    const partnerIds = await this.getPartnerIds(userId, membership?.coupleId);

    const where: Prisma.WishlistWhereInput = {};
    if (scope === 'mine') {
      where.visibility = 'PERSONAL';
      where.ownerId = userId;
    } else if (scope === 'personal') {
      // Personal = what my partner wants — I open it to buy a gift
      where.visibility = 'PERSONAL';
      where.ownerId = { in: partnerIds.length ? partnerIds : ['none'] };
    } else if (scope === 'shared') {
      where.visibility = 'SHARED';
      where.coupleId = membership?.coupleId ?? 'none';
    } else {
      where.OR = [
        { visibility: 'PERSONAL' },
        { visibility: 'SHARED', coupleId: membership?.coupleId ?? 'none' },
      ];
    }

    const wishlists = await this.prisma.wishlist.findMany({
      where,
      include: {
        _count: { select: { wishes: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return wishlists.map((w) => this.toDto(w, w._count.wishes, userId));
  }

  async getDetail(userId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        wishes: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { wishes: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Список желаний не найден' });
    await this.checkAccess(userId, wishlist);

    return {
      ...this.toDto(wishlist, wishlist._count.wishes, userId),
      wishes: wishlist.wishes.map((w) => this.wishToDto(w)),
    };
  }

  async create(userId: string, data: { title: string; description?: string; visibility: Visibility }) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });

    const wishlist = await this.prisma.wishlist.create({
      data: {
        ownerId: userId,
        title: data.title,
        description: data.description ?? null,
        visibility: data.visibility,
        coupleId: data.visibility === 'SHARED' ? membership?.coupleId ?? null : null,
      },
      include: { _count: { select: { wishes: true } } },
    });

    return this.toDto(wishlist, 0, userId);
  }

  async update(userId: string, id: string, data: { title?: string; description?: string }) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Список желаний не найден' });
    if (wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Только владелец может это сделать' });
    }

    const updated = await this.prisma.wishlist.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: { _count: { select: { wishes: true } } },
    });

    return this.toDto(updated, updated._count.wishes, userId);
  }

  async remove(userId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Список желаний не найден' });
    if (wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Только владелец может это сделать' });
    }
    await this.prisma.wishlist.delete({ where: { id } });
  }

  async reorder(userId: string, id: string, order: string[]) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Список желаний не найден' });
    await this.checkAccess(userId, wishlist);

    await this.prisma.$transaction(
      order.map((wishId, index) =>
        this.prisma.wish.update({ where: { id: wishId }, data: { sortOrder: index } }),
      ),
    );
  }

  private async checkAccess(userId: string, wishlist: { ownerId: string; visibility: string; coupleId: string | null }) {
    if (wishlist.ownerId === userId) return;

    // Partner can open personal lists (gift ideas) and shared lists
    if (wishlist.coupleId) {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { userId, coupleId: wishlist.coupleId },
      });
      if (membership) return;
    } else {
      const mine = await this.prisma.coupleMember.findFirst({ where: { userId } });
      if (mine) {
        const ownerInCouple = await this.prisma.coupleMember.findFirst({
          where: { userId: wishlist.ownerId, coupleId: mine.coupleId },
        });
        if (ownerInCouple) return;
      }
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
  }

  private async getPartnerIds(userId: string, coupleId?: string): Promise<string[]> {
    if (!coupleId) return [];
    const members = await this.prisma.coupleMember.findMany({
      where: { coupleId, userId: { not: userId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private toDto(w: any, wishCount: number, viewerId?: string) {
    return {
      id: w.id,
      ownerId: w.ownerId,
      owner: w.owner
        ? { id: w.owner.id, name: w.owner.name, avatarUrl: w.owner.avatarUrl ?? null }
        : undefined,
      isOwner: viewerId != null ? w.ownerId === viewerId : w.ownerId === viewerId,
      coupleId: w.coupleId,
      title: w.title,
      description: w.description,
      visibility: w.visibility,
      wishCount,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }

  private wishToDto(w: any) {
    return {
      id: w.id,
      wishlistId: w.wishlistId,
      title: w.title,
      description: w.description,
      price: w.price ? Number(w.price) : null,
      currency: w.currency,
      url: w.url,
      imageUrl: w.imageUrl,
      priority: w.priority,
      status: w.status,
      reservedById: w.reservedById,
      reservedAt: w.reservedAt?.toISOString() ?? null,
      sortOrder: w.sortOrder,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }
}

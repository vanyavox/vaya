import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Visibility, Prisma } from '@prisma/client';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, scope: 'personal' | 'shared' | 'all' = 'all') {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });

    const where: Prisma.WishlistWhereInput = {};
    if (scope === 'personal') {
      where.ownerId = userId;
      where.visibility = 'PERSONAL';
    } else if (scope === 'shared') {
      where.visibility = 'SHARED';
      if (membership) where.coupleId = membership.coupleId;
    } else {
      where.OR = [
        { ownerId: userId },
        ...(membership ? [{ coupleId: membership.coupleId, visibility: 'SHARED' as const }] : []),
      ];
    }

    const wishlists = await this.prisma.wishlist.findMany({
      where,
      include: { _count: { select: { wishes: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return wishlists.map((w) => this.toDto(w, w._count.wishes));
  }

  async getDetail(userId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        wishes: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { wishes: true } },
      },
    });

    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
    await this.checkAccess(userId, wishlist);

    return {
      ...this.toDto(wishlist, wishlist._count.wishes),
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

    return this.toDto(wishlist, 0);
  }

  async update(userId: string, id: string, data: { title?: string; description?: string }) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
    if (wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not the owner' });
    }

    const updated = await this.prisma.wishlist.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: { _count: { select: { wishes: true } } },
    });

    return this.toDto(updated, updated._count.wishes);
  }

  async remove(userId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
    if (wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not the owner' });
    }
    await this.prisma.wishlist.delete({ where: { id } });
  }

  async reorder(userId: string, id: string, order: string[]) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
    await this.checkAccess(userId, wishlist);

    await this.prisma.$transaction(
      order.map((wishId, index) =>
        this.prisma.wish.update({ where: { id: wishId }, data: { sortOrder: index } }),
      ),
    );
  }

  private async checkAccess(userId: string, wishlist: { ownerId: string; visibility: string; coupleId: string | null }) {
    if (wishlist.ownerId === userId) return;
    if (wishlist.visibility === 'SHARED' && wishlist.coupleId) {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { userId, coupleId: wishlist.coupleId },
      });
      if (membership) return;
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No access' });
  }

  private toDto(w: { id: string; ownerId: string; coupleId: string | null; title: string; description: string | null; visibility: string; createdAt: Date; updatedAt: Date }, wishCount: number) {
    return {
      id: w.id,
      ownerId: w.ownerId,
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

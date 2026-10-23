import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WishStatus, Priority, Prisma } from '@prisma/client';

@Injectable()
export class WishesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: { wishlistId?: string; status?: WishStatus; hideReserved?: boolean },
  ) {
    const where: Prisma.WishWhereInput = {};

    if (query.wishlistId) {
      const wishlist = await this.prisma.wishlist.findUnique({
        where: { id: query.wishlistId },
      });
      if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
      await this.checkWishlistAccess(userId, wishlist);
      where.wishlistId = query.wishlistId;
    } else {
      // All accessible wishes
      const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
      where.wishlist = {
        OR: [
          { ownerId: userId },
          ...(membership
            ? [{ coupleId: membership.coupleId, visibility: 'SHARED' as const }]
            : []),
        ],
      };
    }

    if (query.status) where.status = query.status;
    if (query.hideReserved) {
      where.status = { not: 'RESERVED' };
    }

    const wishes = await this.prisma.wish.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return wishes.map((w) => this.toDto(w));
  }

  async getDetail(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });
    await this.checkWishlistAccess(userId, wish.wishlist);
    return this.toDto(wish);
  }

  async create(
    userId: string,
    wishlistId: string,
    data: {
      title: string;
      description?: string;
      price?: number;
      currency?: string;
      url?: string;
      imageUrl?: string;
      priority?: Priority;
    },
  ) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { id: wishlistId } });
    if (!wishlist) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wishlist not found' });
    if (wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only owner can add wishes' });
    }

    const maxSort = await this.prisma.wish.aggregate({
      where: { wishlistId },
      _max: { sortOrder: true },
    });

    const wish = await this.prisma.wish.create({
      data: {
        wishlistId,
        title: data.title,
        description: data.description ?? null,
        price: data.price ?? null,
        currency: data.currency ?? 'RUB',
        url: data.url ?? null,
        imageUrl: data.imageUrl ?? null,
        priority: data.priority ?? 'MEDIUM',
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return this.toDto(wish);
  }

  async update(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      url?: string;
      imageUrl?: string;
      priority?: Priority;
      sortOrder?: number;
    },
  ) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });

    // Only the wishlist owner (wish creator) can edit content
    if (wish.wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only owner can edit wishes' });
    }

    const updated = await this.prisma.wish.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    return this.toDto(updated);
  }

  async remove(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });
    if (wish.wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only owner can delete wishes' });
    }
    await this.prisma.wish.delete({ where: { id } });
  }

  async reserve(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });
    await this.checkWishlistAccess(userId, wish.wishlist);

    if (wish.wishlist.ownerId === userId) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Cannot reserve own wish' });
    }
    if (wish.status !== 'AVAILABLE') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Wish is not available' });
    }

    const updated = await this.prisma.wish.update({
      where: { id },
      data: { status: 'RESERVED', reservedById: userId, reservedAt: new Date() },
    });
    return this.toDto(updated);
  }

  async unreserve(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });

    if (wish.reservedById !== userId && wish.wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
    }
    if (wish.status !== 'RESERVED') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Wish is not reserved' });
    }

    const updated = await this.prisma.wish.update({
      where: { id },
      data: { status: 'AVAILABLE', reservedById: null, reservedAt: null },
    });
    return this.toDto(updated);
  }

  async gift(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });

    if (wish.reservedById !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only the person who reserved can mark as gifted' });
    }
    if (wish.status !== 'RESERVED') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Wish is not reserved' });
    }

    const updated = await this.prisma.wish.update({
      where: { id },
      data: { status: 'GIFTED' },
    });
    return this.toDto(updated);
  }

  async receive(userId: string, id: string) {
    const wish = await this.prisma.wish.findUnique({
      where: { id },
      include: { wishlist: true },
    });
    if (!wish) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Wish not found' });

    if (wish.wishlist.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only owner can mark as received' });
    }
    if (wish.status !== 'GIFTED') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Wish is not gifted yet' });
    }

    const updated = await this.prisma.wish.update({
      where: { id },
      data: { status: 'RECEIVED' },
    });
    return this.toDto(updated);
  }

  private async checkWishlistAccess(
    userId: string,
    wishlist: { ownerId: string; visibility: string; coupleId: string | null },
  ) {
    if (wishlist.ownerId === userId) return;
    if (wishlist.visibility === 'SHARED' && wishlist.coupleId) {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { userId, coupleId: wishlist.coupleId },
      });
      if (membership) return;
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No access' });
  }

  private toDto(w: any) {
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

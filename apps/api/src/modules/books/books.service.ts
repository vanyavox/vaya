import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { BookStatus, Prisma } from '@prisma/client';

type ReadBy = 'me' | 'partner' | 'both';

const READER_SELECT = { id: true, name: true, avatarUrl: true } as const;

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private async getCoupleId(userId: string): Promise<string> {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (!membership) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Вы не состоите в паре' });
    }
    return membership.coupleId;
  }

  private async resolveReaderIds(userId: string, coupleId: string, readBy: ReadBy): Promise<string[]> {
    const members = await this.prisma.coupleMember.findMany({
      where: { coupleId },
      select: { userId: true },
    });
    const partnerId = members.map((m) => m.userId).find((id) => id !== userId);
    if (readBy === 'me') return [userId];
    if (readBy === 'partner') return partnerId ? [partnerId] : [];
    return partnerId ? [userId, partnerId] : [userId];
  }

  private async getOwnedBook(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { readers: { select: READER_SELECT } },
    });
    if (!book) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Книга не найдена' });
    if (book.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    return book;
  }

  async list(
    userId: string,
    query: {
      status?: BookStatus;
      q?: string;
      sort?: 'asc' | 'desc';
      page?: number;
      perPage?: number;
    },
  ) {
    const coupleId = await this.getCoupleId(userId);
    const where: Prisma.BookWhereInput = { coupleId };

    if (query.status) where.status = query.status;
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 12));

    const [total, books] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        orderBy: { title: query.sort === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { readers: { select: READER_SELECT } },
      }),
    ]);

    return {
      items: books.map((b) => this.toDto(b)),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async getDetail(userId: string, id: string) {
    const book = await this.getOwnedBook(userId, id);
    return this.toDto(book);
  }

  async create(
    userId: string,
    data: {
      title: string;
      author: string;
      description?: string;
      status?: BookStatus;
      rating?: number | null;
      readBy?: ReadBy | null;
    },
  ) {
    const coupleId = await this.getCoupleId(userId);
    const title = data.title.trim();
    const author = data.author.trim();

    const duplicate = await this.prisma.book.findFirst({
      where: {
        coupleId,
        title: { equals: title, mode: 'insensitive' },
        author: { equals: author, mode: 'insensitive' },
      },
      select: { title: true, author: true },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `«${duplicate.title}» (${duplicate.author}) уже есть в библиотеке`,
      });
    }

    const readerIds = data.readBy ? await this.resolveReaderIds(userId, coupleId, data.readBy) : [];

    const book = await this.prisma.book.create({
      data: {
        coupleId,
        creatorId: userId,
        title,
        author,
        description: data.description ?? null,
        status: data.status ?? 'UNREAD',
        rating: data.rating ?? null,
        ...(readerIds.length > 0 && { readers: { connect: readerIds.map((id) => ({ id })) } }),
      },
      include: { readers: { select: READER_SELECT } },
    });

    void this.pushService.notifyPartner(userId, {
      title: 'Новая книга в библиотеке',
      body: `${book.title} — ${book.author}`,
      url: '/app/books',
    });

    return this.toDto(book);
  }

  async update(
    userId: string,
    id: string,
    data: {
      title?: string;
      author?: string;
      description?: string;
      status?: BookStatus;
      rating?: number | null;
      readBy?: ReadBy | null;
    },
  ) {
    const book = await this.getOwnedBook(userId, id);

    let readers: Prisma.BookUpdateInput['readers'] | undefined;
    if (data.readBy !== undefined) {
      const readerIds =
        data.readBy === null ? [] : await this.resolveReaderIds(userId, book.coupleId, data.readBy);
      readers = { set: readerIds.map((rid) => ({ id: rid })) };
    }

    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.author !== undefined && { author: data.author.trim() }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(readers !== undefined && { readers }),
      },
      include: { readers: { select: READER_SELECT } },
    });

    return this.toDto(updated);
  }

  async setStatus(userId: string, id: string, status: BookStatus) {
    await this.getOwnedBook(userId, id);
    const updated = await this.prisma.book.update({
      where: { id },
      data: { status },
      include: { readers: { select: READER_SELECT } },
    });
    return this.toDto(updated);
  }

  async remove(userId: string, id: string) {
    await this.getOwnedBook(userId, id);
    await this.prisma.book.delete({ where: { id } });
  }

  private toDto(b: {
    id: string;
    coupleId: string;
    creatorId: string;
    title: string;
    author: string;
    description: string | null;
    status: string;
    rating: number | null;
    createdAt: Date;
    updatedAt: Date;
    readers?: { id: string; name: string; avatarUrl: string | null }[];
  }) {
    return {
      id: b.id,
      coupleId: b.coupleId,
      creatorId: b.creatorId,
      title: b.title,
      author: b.author,
      description: b.description,
      status: b.status,
      rating: b.rating,
      readers: b.readers ?? [],
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}

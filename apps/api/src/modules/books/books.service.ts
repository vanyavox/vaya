import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { BookStatus, Prisma } from '@prisma/client';

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

  private async getOwnedBook(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Книга не найдена' });
    if (book.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    return book;
  }

  async list(userId: string, query: { status?: BookStatus; q?: string; sort?: 'asc' | 'desc' }) {
    const coupleId = await this.getCoupleId(userId);
    const where: Prisma.BookWhereInput = { coupleId };

    if (query.status) where.status = query.status;
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }

    const books = await this.prisma.book.findMany({
      where,
      orderBy: { title: query.sort === 'desc' ? 'desc' : 'asc' },
    });

    return books.map((b) => this.toDto(b));
  }

  async getDetail(userId: string, id: string) {
    const book = await this.getOwnedBook(userId, id);
    return this.toDto(book);
  }

  async create(
    userId: string,
    data: { title: string; author: string; description?: string; status?: BookStatus },
  ) {
    const coupleId = await this.getCoupleId(userId);

    const book = await this.prisma.book.create({
      data: {
        coupleId,
        creatorId: userId,
        title: data.title,
        author: data.author,
        description: data.description ?? null,
        status: data.status ?? 'UNREAD',
      },
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
    },
  ) {
    await this.getOwnedBook(userId, id);

    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.author !== undefined && { author: data.author }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return this.toDto(updated);
  }

  async setStatus(userId: string, id: string, status: BookStatus) {
    await this.getOwnedBook(userId, id);
    const updated = await this.prisma.book.update({ where: { id }, data: { status } });
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
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: b.id,
      coupleId: b.coupleId,
      creatorId: b.creatorId,
      title: b.title,
      author: b.author,
      description: b.description,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}

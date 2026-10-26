import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, TaskCategory, Priority, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCoupleId(userId: string): Promise<string> {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (!membership) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Вы не состоите в паре' });
    }
    return membership.coupleId;
  }

  async list(
    userId: string,
    query: {
      assignee?: string;
      category?: TaskCategory;
      status?: TaskStatus;
      q?: string;
      due?: string;
    },
  ) {
    const coupleId = await this.getCoupleId(userId);
    const where: Prisma.TaskWhereInput = { coupleId };

    // Assignee filter
    if (query.assignee === 'me') {
      where.assigneeId = userId;
    } else if (query.assignee === 'partner') {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { coupleId, NOT: { userId } },
      });
      where.assigneeId = membership?.userId ?? 'none';
    } else if (query.assignee === 'unassigned') {
      where.assigneeId = null;
    }

    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Due filter
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (query.due === 'today') {
      where.dueDate = { gte: todayStart, lt: todayEnd };
    } else if (query.due === 'week') {
      where.dueDate = { gte: todayStart, lt: weekEnd };
    } else if (query.due === 'overdue') {
      where.dueDate = { lt: todayStart };
      where.status = { not: 'DONE' };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { priority: 'desc' }],
    });

    return tasks.map((t) => this.toDto(t));
  }

  async getDetail(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Задача не найдена' });
    if (task.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    return this.toDto(task);
  }

  async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      category?: TaskCategory;
      priority?: Priority;
      dueDate?: string;
    },
  ) {
    const coupleId = await this.getCoupleId(userId);

    const task = await this.prisma.task.create({
      data: {
        coupleId,
        creatorId: userId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        category: data.category ?? 'OTHER',
        priority: data.priority ?? 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return this.toDto(task);
  }

  async update(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string;
      category?: TaskCategory;
      status?: TaskStatus;
      priority?: Priority;
      dueDate?: string;
    },
  ) {
    const coupleId = await this.getCoupleId(userId);
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Задача не найдена' });
    if (task.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.status !== undefined && {
          status: data.status,
          completedAt: data.status === 'DONE' ? (task.completedAt ?? new Date()) : null,
        }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
    });

    return this.toDto(updated);
  }

  async remove(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Задача не найдена' });
    if (task.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }
    await this.prisma.task.delete({ where: { id } });
  }

  async complete(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Задача не найдена' });
    if (task.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });
    return this.toDto(updated);
  }

  async reopen(userId: string, id: string) {
    const coupleId = await this.getCoupleId(userId);
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Задача не найдена' });
    if (task.coupleId !== coupleId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'TODO', completedAt: null },
    });
    return this.toDto(updated);
  }

  async stats(userId: string) {
    const coupleId = await this.getCoupleId(userId);

    const [couple, personal] = await Promise.all([
      this.countStats({ coupleId }),
      this.countStats({ coupleId, assigneeId: userId }),
    ]);

    return { couple, personal };
  }

  private async countStats(where: Prisma.TaskWhereInput) {
    const byStatus = await this.prisma.task.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const byCategory = await this.prisma.task.groupBy({
      by: ['category'],
      where,
      _count: true,
    });

    const statusMap: Record<string, number> = {
      TODO: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0,
    };
    for (const s of byStatus) statusMap[s.status] = s._count;

    const categoryMap: Record<string, number> = {
      CLEANING: 0, COOKING: 0, SHOPPING: 0, REPAIRS: 0,
      DOCS: 0, PET: 0, FINANCE: 0, OTHER: 0,
    };
    for (const c of byCategory) categoryMap[c.category] = c._count;

    return {
      byStatus: statusMap,
      byCategory: categoryMap,
      total: byStatus.reduce((acc, s) => acc + s._count, 0),
    };
  }

  private toDto(t: any) {
    return {
      id: t.id,
      coupleId: t.coupleId,
      creatorId: t.creatorId,
      assigneeId: t.assigneeId,
      title: t.title,
      description: t.description,
      category: t.category,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}

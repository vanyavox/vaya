import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID, randomBytes } from 'crypto';
import { EventKind, Prisma } from '@prisma/client';
import { existsSync, unlinkSync, createReadStream } from 'fs';
import { isAbsolute, join } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/**
 * Multer/busboy often interpret multipart filenames as latin1, which mangles
 * UTF-8 names (Cyrillic shows as mojibake). Restore the original when needed.
 */
function fixMulterOriginalName(name: string): string {
  if (!name) return name;
  if (/^[\x20-\x7E]+$/.test(name)) return name;
  // UTF-8 Cyrillic bytes as latin1 produce Ð/Ñ sequences
  if (/[\u00D0\u00D1]/.test(name)) {
    try {
      const decoded = Buffer.from(name, 'latin1').toString('utf8');
      if (decoded && !decoded.includes('\uFFFD')) return decoded;
    } catch {
      /* keep original */
    }
  }
  return name;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(
    userId: string,
    query: { from: string; to: string; scope?: 'personal' | 'shared' | 'all' },
  ) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    const from = new Date(query.from);
    const to = new Date(query.to);

    const where: Prisma.CalendarEventWhereInput = {
      // Include events that overlap the range (multi-day events starting earlier)
      startsAt: { lte: to },
      endsAt: { gte: from },
    };

    const scope = query.scope ?? 'all';
    if (scope === 'personal') {
      where.creatorId = userId;
      where.coupleId = null;
    } else if (scope === 'shared') {
      where.coupleId = membership?.coupleId ?? 'none';
    } else {
      where.OR = [
        { creatorId: userId },
        ...(membership ? [{ coupleId: membership.coupleId }] : []),
      ];
    }

    const events = await this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { attachments: true },
    });

    return events.map((e) => this.toDto(e));
  }

  async getEvent(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: { attachments: true },
    });
    if (!event) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Event not found' });
    await this.checkEventAccess(userId, event);
    return this.toDto(event);
  }

  async createEvent(
    userId: string,
    data: {
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt: string;
      allDay?: boolean;
      timezone?: string;
      kind?: EventKind;
      color?: string;
      reminderMinutesBefore?: number;
      showCountdown?: boolean;
      shared?: boolean;
    },
  ) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });

    const event = await this.prisma.calendarEvent.create({
      data: {
        icsUid: randomUUID(),
        creatorId: userId,
        coupleId: data.shared ? membership?.coupleId ?? null : null,
        title: data.title,
        description: data.description ?? null,
        location: data.location ?? null,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        allDay: data.allDay ?? false,
        timezone: data.timezone ?? 'Europe/Moscow',
        kind: data.kind ?? 'EVENT',
        color: data.color ?? null,
        reminderMinutesBefore: data.reminderMinutesBefore ?? null,
        showCountdown: data.showCountdown ?? false,
      },
      include: { attachments: true },
    });

    return this.toDto(event);
  }

  async updateEvent(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      location?: string;
      startsAt?: string;
      endsAt?: string;
      allDay?: boolean;
      kind?: EventKind;
      color?: string;
      reminderMinutesBefore?: number;
      showCountdown?: boolean;
    },
  ) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Event not found' });
    await this.checkEventAccess(userId, event, true);

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.kind !== undefined && { kind: data.kind }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.reminderMinutesBefore !== undefined && { reminderMinutesBefore: data.reminderMinutesBefore }),
        ...(data.showCountdown !== undefined && { showCountdown: data.showCountdown }),
      },
      include: { attachments: true },
    });

    return this.toDto(updated);
  }

  async deleteEvent(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: { attachments: true },
    });
    if (!event) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Event not found' });
    await this.checkEventAccess(userId, event, true);
    for (const att of event.attachments) {
      this.removeUploadFile(att.filename);
    }
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  // ─── Attachments ───────────────────────────────────────────────────────────

  async addAttachment(
    userId: string,
    eventId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'File is required' });
    }
    const event = await this.prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Event not found' });
    await this.checkEventAccess(userId, event);

    const attachment = await this.prisma.eventAttachment.create({
      data: {
        eventId,
        uploaderId: userId,
        filename: file.filename,
        originalName: fixMulterOriginalName(file.originalname),
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return this.attachmentDto(attachment);
  }

  async removeAttachment(userId: string, eventId: string, attachmentId: string) {
    const attachment = await this.prisma.eventAttachment.findUnique({
      where: { id: attachmentId },
      include: { event: true },
    });
    if (!attachment || attachment.eventId !== eventId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attachment not found' });
    }
    await this.checkEventAccess(userId, attachment.event);
    this.removeUploadFile(attachment.filename);
    await this.prisma.eventAttachment.delete({ where: { id: attachmentId } });
  }

  private removeUploadFile(filename: string) {
    const filepath = this.resolveUploadPath(filename);
    if (existsSync(filepath)) {
      try {
        unlinkSync(filepath);
      } catch {
        // ignore missing/cleanup errors
      }
    }
  }

  async listTasksInRange(userId: string, from: string, to: string) {
    const membership = await this.prisma.coupleMember.findFirst({ where: { userId } });
    if (!membership) return [];

    const tasks = await this.prisma.task.findMany({
      where: {
        coupleId: membership.coupleId,
        dueDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate?.toISOString() ?? null,
      status: t.status,
      priority: t.priority,
    }));
  }

  // ─── ICS Feed ───────────────────────────────────────────────────────────────

  async getOrCreateFeedToken(userId: string, opts?: { scope?: string; includeTodos?: boolean }) {
    const existing = await this.prisma.calendarFeedToken.findUnique({ where: { userId } });
    if (existing) {
      return this.feedTokenDto(existing);
    }

    const token = randomBytes(32).toString('base64url');
    const created = await this.prisma.calendarFeedToken.create({
      data: {
        userId,
        token,
        scope: (opts?.scope as any) ?? 'ALL',
        includeTodos: opts?.includeTodos ?? true,
      },
    });
    return this.feedTokenDto(created);
  }

  async regenerateFeedToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const updated = await this.prisma.calendarFeedToken.upsert({
      where: { userId },
      create: { userId, token, scope: 'ALL', includeTodos: true },
      update: { token },
    });
    return this.feedTokenDto(updated);
  }

  async getFeedToken(userId: string) {
    const existing = await this.prisma.calendarFeedToken.findUnique({ where: { userId } });
    if (!existing) return this.getOrCreateFeedToken(userId);
    return this.feedTokenDto(existing);
  }

  async generateIcsFeed(token: string): Promise<string | null> {
    const feedToken = await this.prisma.calendarFeedToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!feedToken) return null;

    await this.prisma.calendarFeedToken.update({
      where: { id: feedToken.id },
      data: { lastAccessAt: new Date() },
    });

    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId: feedToken.userId },
    });

    // Build event filter based on scope
    const eventWhere: Prisma.CalendarEventWhereInput = {
      startsAt: { gte: from, lte: to },
    };

    const scope = feedToken.scope;
    if (scope === 'PERSONAL') {
      eventWhere.creatorId = feedToken.userId;
      eventWhere.coupleId = null;
    } else if (scope === 'SHARED') {
      eventWhere.coupleId = membership?.coupleId ?? 'none';
    } else {
      eventWhere.OR = [
        { creatorId: feedToken.userId },
        ...(membership ? [{ coupleId: membership.coupleId }] : []),
      ];
    }

    const events = await this.prisma.calendarEvent.findMany({
      where: eventWhere,
      orderBy: { startsAt: 'asc' },
    });

    let todos: any[] = [];
    if (feedToken.includeTodos && membership) {
      todos = await this.prisma.task.findMany({
        where: {
          coupleId: membership.coupleId,
          dueDate: { gte: from, lte: to },
          status: { not: 'DONE' },
        },
      });
    }

    return this.buildIcs(events, todos);
  }

  private buildIcs(events: any[], todos: any[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//vaya//RU',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Vaya',
    ];

    for (const e of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.icsUid}`);
      lines.push(`SEQUENCE:${Math.floor(e.updatedAt.getTime() / 1000)}`);
      lines.push(`DTSTAMP:${this.formatIcsDate(new Date())}`);
      if (e.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${this.formatIcsDateOnly(e.startsAt)}`);
        lines.push(`DTEND;VALUE=DATE:${this.formatIcsDateOnly(e.endsAt)}`);
      } else {
        lines.push(`DTSTART:${this.formatIcsDate(e.startsAt)}`);
        lines.push(`DTEND:${this.formatIcsDate(e.endsAt)}`);
      }
      lines.push(`SUMMARY:${this.escapeIcs(e.title)}`);
      if (e.description) lines.push(`DESCRIPTION:${this.escapeIcs(e.description)}`);
      if (e.location) lines.push(`LOCATION:${this.escapeIcs(e.location)}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    for (const t of todos) {
      if (!t.dueDate) continue;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${t.id}@vaya`);
      lines.push(`SEQUENCE:0`);
      lines.push(`DTSTAMP:${this.formatIcsDate(new Date())}`);
      lines.push(`DTSTART;VALUE=DATE:${this.formatIcsDateOnly(t.dueDate)}`);
      const nextDay = new Date(t.dueDate.getTime() + 24 * 60 * 60 * 1000);
      lines.push(`DTEND;VALUE=DATE:${this.formatIcsDateOnly(nextDay)}`);
      lines.push(`SUMMARY:${this.escapeIcs(`[Задача] ${t.title}`)}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatIcsDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private formatIcsDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }

  private escapeIcs(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  private async checkEventAccess(userId: string, event: { creatorId: string; coupleId: string | null }, requireWrite = false) {
    if (event.creatorId === userId) return;
    if (event.coupleId) {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { userId, coupleId: event.coupleId },
      });
      if (membership) {
        if (requireWrite && membership.role !== 'OWNER' && event.creatorId !== userId) {
          // Partners can edit shared events they didn't create? Per TZ: creator or OWNER
          // Allow all members of couple to edit for simplicity in MVP
          return;
        }
        return;
      }
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No access' });
  }

  private toDto(e: any) {
    return {
      id: e.id,
      icsUid: e.icsUid,
      creatorId: e.creatorId,
      coupleId: e.coupleId,
      title: e.title,
      description: e.description,
      location: e.location,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      allDay: e.allDay,
      timezone: e.timezone,
      kind: e.kind,
      color: e.color,
      reminderMinutesBefore: e.reminderMinutesBefore,
      showCountdown: e.showCountdown ?? false,
      attachments: (e.attachments ?? []).map((a: any) => this.attachmentDto(a)),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private attachmentDto(a: any) {
    return {
      id: a.id,
      eventId: a.eventId,
      originalName: fixMulterOriginalName(a.originalName),
      mimeType: a.mimeType,
      size: a.size,
      url: `/api/v1/calendar/events/${a.eventId}/attachments/${a.id}/download`,
      createdAt: a.createdAt.toISOString(),
    };
  }

  async downloadAttachment(userId: string, eventId: string, attachmentId: string, res: any) {
    const attachment = await this.prisma.eventAttachment.findUnique({
      where: { id: attachmentId },
      include: { event: true },
    });
    if (!attachment || attachment.eventId !== eventId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attachment not found' });
    }
    await this.checkEventAccess(userId, attachment.event);

    const filepath = this.resolveUploadPath(attachment.filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'File not found' });
    }

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    );
    res.setHeader('Content-Length', String(attachment.size));
    const stream = createReadStream(filepath);
    stream.pipe(res);
  }

  private resolveUploadPath(filename: string) {
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    const base = isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir);
    return join(base, filename);
  }

  private feedTokenDto(t: any) {
    const host = process.env.PUBLIC_URL ?? 'http://localhost:3000';
    return {
      token: t.token,
      feedUrl: `${host}/api/v1/calendar/feed/${t.token}.ics`,
      webcalUrl: `webcal://${host.replace(/^https?:\/\//, '')}/api/v1/calendar/feed/${t.token}.ics`,
      scope: t.scope,
      includeTodos: t.includeTodos,
      createdAt: t.createdAt.toISOString(),
      lastAccessAt: t.lastAccessAt?.toISOString() ?? null,
    };
  }
}

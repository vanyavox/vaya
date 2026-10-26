import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsDateString, MinLength } from 'class-validator';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { CalendarService } from './calendar.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

const ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024;

const attachmentUploadDir = (() => {
  const dir = process.env.UPLOAD_DIR ?? 'uploads';
  return dir.startsWith('/') ? dir : require('path').join(process.cwd(), dir);
})();

const attachmentStorage = diskStorage({
  destination: attachmentUploadDir,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

class CreateEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(['EVENT', 'MEETING', 'DATE', 'HOLIDAY'])
  kind?: 'EVENT' | 'MEETING' | 'DATE' | 'HOLIDAY';

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;

  @IsOptional()
  @IsBoolean()
  showCountdown?: boolean;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsEnum(['EVENT', 'MEETING', 'DATE', 'HOLIDAY'])
  kind?: 'EVENT' | 'MEETING' | 'DATE' | 'HOLIDAY';

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;

  @IsOptional()
  @IsBoolean()
  showCountdown?: boolean;
}

class FeedTokenDto {
  @IsOptional()
  @IsEnum(['ALL', 'PERSONAL', 'SHARED'])
  scope?: 'ALL' | 'PERSONAL' | 'SHARED';

  @IsOptional()
  @IsBoolean()
  includeTodos?: boolean;
}

@ApiTags('calendar')
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ─── Events ─────────────────────────────────────────────────────────────────

  @Get('calendar/events')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'События в диапазоне' })
  listEvents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('scope') scope?: 'personal' | 'shared' | 'all',
  ) {
    return this.calendarService.listEvents(user.id, { from, to, scope });
  }

  @Get('calendar/events/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детали события' })
  getEvent(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.calendarService.getEvent(user.id, id);
  }

  @Post('calendar/events')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать событие' })
  createEvent(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEventDto) {
    return this.calendarService.createEvent(user.id, dto);
  }

  @Patch('calendar/events/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить событие' })
  updateEvent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.updateEvent(user.id, id, dto);
  }

  @Delete('calendar/events/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить событие' })
  deleteEvent(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.calendarService.deleteEvent(user.id, id);
  }

  // ─── Event attachments ─────────────────────────────────────────────────────

  @Post('calendar/events/:id/attachments')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Прикрепить файл к событию (до 25 МБ)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: attachmentStorage,
      limits: { fileSize: ATTACHMENT_MAX_SIZE },
    }),
  )
  uploadAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.calendarService.addAttachment(user.id, id, file);
  }

  @Get('calendar/events/:id/attachments/:attachmentId/download')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Скачать вложение события' })
  downloadAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    return this.calendarService.downloadAttachment(user.id, id, attachmentId, res);
  }

  @Delete('calendar/events/:id/attachments/:attachmentId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить вложение события' })
  deleteAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.calendarService.removeAttachment(user.id, id, attachmentId);
  }

  // ─── Tasks in range ─────────────────────────────────────────────────────────

  @Get('calendar/tasks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Задачи в диапазоне дат' })
  listTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.calendarService.listTasksInRange(user.id, from, to);
  }

  // ─── Feed token ─────────────────────────────────────────────────────────────

  @Get('calendar/feed-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить feed-токен' })
  getFeedToken(@CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.getFeedToken(user.id);
  }

  @Post('calendar/feed-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Перевыпустить feed-токен' })
  regenerateFeedToken(@CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.regenerateFeedToken(user.id);
  }

  // ─── ICS Feed (public) ──────────────────────────────────────────────────────

  @Get('calendar/feed/:token.ics')
  @ApiOperation({ summary: 'ICS-подписка (Apple Calendar)' })
  async getIcsFeed(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const ics = await this.calendarService.generateIcsFeed(token);
    if (!ics) {
      res.status(404).json({ statusCode: 404, code: 'NOT_FOUND', message: 'Подписка не найдена' });
      return;
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(ics);
  }
}

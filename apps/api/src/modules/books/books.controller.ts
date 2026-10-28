import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { BooksService } from './books.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class CreateBookDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  author: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['UNREAD', 'READ'])
  status?: 'UNREAD' | 'READ';
}

class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  author?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['UNREAD', 'READ'])
  status?: 'UNREAD' | 'READ';
}

@ApiTags('books')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Список книг общей библиотеки' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: 'UNREAD' | 'READ',
    @Query('q') q?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.booksService.list(user.id, { status, q, sort });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали книги' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.booksService.getDetail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить книгу' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateBookDto) {
    return this.booksService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить книгу' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.booksService.update(user.id, id, dto);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Изменить статус чтения' })
  setStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'UNREAD' | 'READ' },
  ) {
    return this.booksService.setStatus(user.id, id, body.status);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить книгу' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.booksService.remove(user.id, id);
  }
}

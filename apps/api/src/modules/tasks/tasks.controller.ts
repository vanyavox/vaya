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
import { IsString, IsOptional, IsEnum, IsDateString, MinLength } from 'class-validator';
import { TasksService } from './tasks.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(['CLEANING', 'COOKING', 'SHOPPING', 'REPAIRS', 'DOCS', 'PET', 'FINANCE', 'OTHER'])
  category?: 'CLEANING' | 'COOKING' | 'SHOPPING' | 'REPAIRS' | 'DOCS' | 'PET' | 'FINANCE' | 'OTHER';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(['CLEANING', 'COOKING', 'SHOPPING', 'REPAIRS', 'DOCS', 'PET', 'FINANCE', 'OTHER'])
  category?: 'CLEANING' | 'COOKING' | 'SHOPPING' | 'REPAIRS' | 'DOCS' | 'PET' | 'FINANCE' | 'OTHER';

  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Список задач с фильтрами' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('assignee') assignee?: string,
    @Query('category') category?: any,
    @Query('status') status?: any,
    @Query('q') q?: string,
    @Query('due') due?: string,
  ) {
    return this.tasksService.list(user.id, { assignee, category, status, q, due });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Статистика задач' })
  stats(@CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.stats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали задачи' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.getDetail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать задачу' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить задачу' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить задачу' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.remove(user.id, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Отметить выполненной' })
  complete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.complete(user.id, id);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Вернуть в работу' })
  reopen(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.reopen(user.id, id);
  }
}

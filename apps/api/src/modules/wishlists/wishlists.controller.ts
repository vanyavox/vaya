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
import { IsString, IsOptional, IsEnum, IsArray, MinLength } from 'class-validator';
import { WishlistsService } from './wishlists.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class CreateWishlistDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['PERSONAL', 'SHARED'])
  visibility: 'PERSONAL' | 'SHARED';
}

class UpdateWishlistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  order: string[];
}

@ApiTags('wishlists')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Список виш-листов' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('scope') scope?: 'personal' | 'shared' | 'all',
  ) {
    return this.wishlistsService.list(user.id, scope ?? 'all');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали виш-листа' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishlistsService.getDetail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать виш-лист' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateWishlistDto) {
    return this.wishlistsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить виш-лист' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить виш-лист' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishlistsService.remove(user.id, id);
  }

  @Patch(':id/reorder')
  @HttpCode(204)
  @ApiOperation({ summary: 'Изменить порядок желаний' })
  reorder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReorderDto,
  ) {
    return this.wishlistsService.reorder(user.id, id, dto.order);
  }
}

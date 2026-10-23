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
import { IsString, IsOptional, IsEnum, IsNumber, IsUrl, MinLength, Min } from 'class-validator';
import { WishesService } from './wishes.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class CreateWishDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

class UpdateWishDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

@ApiTags('wishes')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Post('wishlists/:wishlistId/wishes')
  @ApiOperation({ summary: 'Создать желание' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('wishlistId') wishlistId: string,
    @Body() dto: CreateWishDto,
  ) {
    return this.wishesService.create(user.id, wishlistId, dto);
  }

  @Get('wishes')
  @ApiOperation({ summary: 'Список желаний с фильтрами' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('wishlistId') wishlistId?: string,
    @Query('status') status?: any,
    @Query('hideReserved') hideReserved?: string,
  ) {
    return this.wishesService.list(user.id, {
      wishlistId,
      status,
      hideReserved: hideReserved === 'true',
    });
  }

  @Get('wishes/:id')
  @ApiOperation({ summary: 'Детали желания' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.getDetail(user.id, id);
  }

  @Patch('wishes/:id')
  @ApiOperation({ summary: 'Редактировать желание' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWishDto,
  ) {
    return this.wishesService.update(user.id, id, dto);
  }

  @Delete('wishes/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить желание' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.remove(user.id, id);
  }

  @Post('wishes/:id/reserve')
  @ApiOperation({ summary: 'Зарезервировать' })
  reserve(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.reserve(user.id, id);
  }

  @Post('wishes/:id/unreserve')
  @ApiOperation({ summary: 'Снять резерв' })
  unreserve(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.unreserve(user.id, id);
  }

  @Post('wishes/:id/gift')
  @ApiOperation({ summary: 'Отметить подаренным' })
  gift(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.gift(user.id, id);
  }

  @Post('wishes/:id/receive')
  @ApiOperation({ summary: 'Отметить полученным' })
  receive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.wishesService.receive(user.id, id);
  }
}

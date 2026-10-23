import { Controller, Get, Post, Delete, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CouplesService } from './couples.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, Length } from 'class-validator';

class CreateCoupleDto {
  @IsOptional()
  @IsString()
  name?: string;
}

class JoinCoupleDto {
  @IsString()
  @Length(8, 8)
  inviteCode: string;
}

@ApiTags('couple')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('couple')
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  @Get()
  @ApiOperation({ summary: 'Текущая пара' })
  getCouple(@CurrentUser() user: CurrentUserPayload) {
    return this.couplesService.getCouple(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать пару' })
  createCouple(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCoupleDto) {
    return this.couplesService.createCouple(user.id, dto.name);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Перевыпустить invite-код' })
  regenerateInvite(@CurrentUser() user: CurrentUserPayload) {
    return this.couplesService.regenerateInvite(user.id);
  }

  @Post('join')
  @ApiOperation({ summary: 'Присоединиться по коду' })
  joinCouple(@CurrentUser() user: CurrentUserPayload, @Body() dto: JoinCoupleDto) {
    return this.couplesService.joinCouple(user.id, dto.inviteCode);
  }

  @Delete('leave')
  @HttpCode(204)
  @ApiOperation({ summary: 'Покинуть пару' })
  leaveCouple(@CurrentUser() user: CurrentUserPayload) {
    return this.couplesService.leaveCouple(user.id);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUrl, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PushService } from './push.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class PushKeysDto {
  @IsString()
  @MinLength(1)
  p256dh: string;

  @IsString()
  @MinLength(1)
  auth: string;
}

class SubscribeDto {
  @IsUrl({ require_protocol: true })
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

class UnsubscribeDto {
  @IsUrl({ require_protocol: true })
  endpoint: string;
}

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'VAPID public key' })
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Подписка на push-уведомления' })
  subscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: SubscribeDto) {
    return this.pushService.saveSubscription(user.id, dto);
  }

  @Post('unsubscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Отписка от push-уведомлений' })
  unsubscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UnsubscribeDto) {
    return this.pushService.removeSubscription(user.id, dto.endpoint);
  }
}

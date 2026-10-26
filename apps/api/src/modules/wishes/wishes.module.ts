import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { WishesService } from './wishes.service';
import { WishesController } from './wishes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PushModule, AuthModule],
  controllers: [WishesController],
  providers: [WishesService],
})
export class WishesModule {}

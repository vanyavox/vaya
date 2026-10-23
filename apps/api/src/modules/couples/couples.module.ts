import { Module } from '@nestjs/common';
import { CouplesService } from './couples.service';
import { CouplesController } from './couples.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CouplesController],
  providers: [CouplesService],
})
export class CouplesModule {}

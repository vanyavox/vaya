import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PushModule, AuthModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}

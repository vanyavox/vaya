import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];

const storage = diskStorage({
  destination: (() => {
    const dir = process.env.UPLOAD_DIR ?? 'uploads';
    return dir.startsWith('/') ? dir : join(process.cwd(), dir);
  })(),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Only PNG, JPEG, WebP allowed' }), false);
  }
};

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновление профиля' })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; email?: string; timezone?: string },
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Post('me/password')
  @ApiOperation({ summary: 'Смена пароля текущего пользователя' })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузка аватара' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
    }),
  )
  uploadAvatar(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.setAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Удаление аватара' })
  removeAvatar(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.removeAvatar(user.id);
  }
}

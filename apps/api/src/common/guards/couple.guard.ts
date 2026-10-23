import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class CoupleGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    const userId = request.user?.id;
    if (!userId) return false;

    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'User is not part of a couple',
      });
    }
    return true;
  }
}

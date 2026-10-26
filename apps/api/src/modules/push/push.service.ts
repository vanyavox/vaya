import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@vaya.local';
    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      this.logger.warn('VAPID keys missing — push notifications disabled');
    }
  }

  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    const data = {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    };
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });
    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: { userId, p256dh: data.p256dh, auth: data.auth },
      });
    }
    return this.prisma.pushSubscription.create({ data });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Send a push notification to the current user's partner (never to self). */
  async notifyPartner(actorUserId: string, payload: PushPayload) {
    if (!this.configured) return;
    try {
      const membership = await this.prisma.coupleMember.findFirst({
        where: { userId: actorUserId },
      });
      if (!membership) return;

      const partner = await this.prisma.coupleMember.findFirst({
        where: { coupleId: membership.coupleId, userId: { not: actorUserId } },
      });
      if (!partner) return;

      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId: partner.userId },
      });
      if (!subs.length) return;

      await Promise.all(
        subs.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          };
          try {
            await webPush.sendNotification(pushSubscription as any, JSON.stringify(payload));
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await this.prisma.pushSubscription
                .deleteMany({ where: { endpoint: sub.endpoint } })
                .catch(() => undefined);
            } else {
              this.logger.warn(`Push failed: ${err?.message ?? err}`);
            }
          }
        }),
      );
    } catch (err: any) {
      this.logger.warn(`notifyPartner error: ${err?.message ?? err}`);
    }
  }
}

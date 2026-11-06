import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { trackMetaEventSchema, type TrackMetaEvent } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MetaConversionsApiService } from '../integrations/meta-conversions-api.service';

/** Relays ad-conversion events that have no backend request of their own
 *  (the demo quiz and a course-detail page view are pure client-side
 *  interactions) to Meta Conversions API — so they're still reported when a
 *  browser blocks the client-side Pixel. Events with a real backend request
 *  (checkout started, payment done) fire from those existing endpoints
 *  instead — see payments.service.ts — not through here. */
@Controller('tracking')
export class TrackingController {
  constructor(private readonly metaCapi: MetaConversionsApiService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('meta-event')
  async trackMetaEvent(@Body(new ZodValidationPipe(trackMetaEventSchema)) body: TrackMetaEvent, @Req() req: Request) {
    await this.metaCapi.send({
      eventName: body.eventName,
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl,
      contentIds: body.contentId ? [body.contentId] : undefined,
      contentName: body.contentName,
      user: {
        fbp: body.fbp,
        fbc: body.fbc,
        clientIp: req.ip,
        userAgent: req.header('user-agent') ?? undefined,
      },
    });
    return { ok: true };
  }
}

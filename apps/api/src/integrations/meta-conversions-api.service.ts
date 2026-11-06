import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';

export interface MetaConversionUserData {
  email?: string;
  /** 10-digit Indian mobile number (the format every phone field in this
   *  app validates against) — hashed with the '91' country-code prefix
   *  Meta's matching expects. */
  phone?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface MetaConversionEvent {
  eventName: 'Lead' | 'ViewContent' | 'InitiateCheckout' | 'Purchase';
  /** Shared with the matching client-side fbq() call for the same real
   *  action, so Meta dedupes the browser Pixel report against this
   *  server-side one instead of double-counting. */
  eventId?: string;
  eventSourceUrl?: string;
  user: MetaConversionUserData;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Meta (Facebook) Conversions API — the server-side half of the web Pixel,
 * so ad conversions are still reported when a browser blocks the
 * client-side Pixel (ad blockers, ITP/Safari) or JS never runs. Disabled
 * (no-op) unless both META_PIXEL_ID and META_CONVERSIONS_API_ACCESS_TOKEN
 * are configured — same degrade-gracefully contract as FcmService/VAPID.
 * Never throws — a marketing-pixel failure must never break the real
 * business action (payment/checkout/lead) it's reporting.
 */
@Injectable()
export class MetaConversionsApiService {
  private readonly logger = new Logger('MetaCapi');
  private readonly enabled: boolean;

  constructor(@Inject(ENV) private readonly env: ApiEnv) {
    this.enabled = !!env.META_PIXEL_ID && !!env.META_CONVERSIONS_API_ACCESS_TOKEN;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async send(event: MetaConversionEvent): Promise<void> {
    if (!this.enabled) return;
    try {
      const userData: Record<string, string | string[]> = {};
      if (event.user.email) userData.em = [sha256(event.user.email)];
      if (event.user.phone) userData.ph = [sha256(`91${event.user.phone.replace(/\D/g, '')}`)];
      if (event.user.fbp) userData.fbp = event.user.fbp;
      if (event.user.fbc) userData.fbc = event.user.fbc;
      if (event.user.clientIp) userData.client_ip_address = event.user.clientIp;
      if (event.user.userAgent) userData.client_user_agent = event.user.userAgent;

      const payload = {
        data: [
          {
            event_name: event.eventName,
            event_time: Math.floor(Date.now() / 1000),
            ...(event.eventId ? { event_id: event.eventId } : {}),
            action_source: 'website',
            ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
            user_data: userData,
            ...(event.value != null || event.contentIds || event.contentName
              ? {
                  custom_data: {
                    ...(event.value != null ? { value: event.value, currency: event.currency ?? 'INR' } : {}),
                    ...(event.contentIds ? { content_ids: event.contentIds } : {}),
                    ...(event.contentName ? { content_name: event.contentName } : {}),
                  },
                }
              : {}),
          },
        ],
      };

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${this.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(this.env.META_CONVERSIONS_API_ACCESS_TOKEN)}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Meta CAPI ${event.eventName} failed (${res.status}): ${text.slice(0, 300)}`);
      }
    } catch (err) {
      this.logger.warn(`Meta CAPI ${event.eventName} errored: ${(err as Error).message}`);
    }
  }
}

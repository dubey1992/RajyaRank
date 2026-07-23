import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { AuthzModule } from './authz/authz.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { InvitationsModule } from './invitations/invitations.module';
import { StaffAdminModule } from './staff-admin/staff-admin.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { StudentsModule } from './students/students.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { MarketingModule } from './marketing/marketing.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CoursesModule } from './courses/courses.module';
import { AssetsModule } from './assets/assets.module';
import { ContentWorkflowModule } from './content-workflow/content-workflow.module';
import { StudentModule } from './student/student.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { TestBuilderModule } from './test-builder/test-builder.module';
import { StudentTestsModule } from './student-tests/student-tests.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { StudentPlansModule } from './student-plans/student-plans.module';
import { CurrentAffairsModule } from './current-affairs/current-affairs.module';
import { ContactModule } from './contact/contact.module';
import { BlogModule } from './blog/blog.module';
import { SettlementsModule } from './settlements/settlements.module';
import { DoubtsModule } from './doubts/doubts.module';
import { SupportModule } from './support/support.module';
import { S3Module } from './s3/s3.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MetricsInterceptor } from './monitoring/metrics.interceptor';
import { HealthModule } from './health/health.module';

import { CorrelationMiddleware } from './common/correlation/correlation.middleware';
import { ResponseInterceptor } from './common/envelope/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AccessGuard } from './auth/access.guard';
import { PermissionsGuard } from './authz/permissions.guard';
import { CsrfGuard } from './authz/csrf.guard';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: (req) => ({ requestId: (req as { correlationId?: string }).correlationId }),
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RedisModule,
    AuditModule,
    NotificationsModule,
    AuthzModule,
    AuthModule,
    InvitationsModule,
    StaffAdminModule,
    OrganizationsModule,
    StudentsModule,
    CatalogueModule,
    MarketingModule,
    SearchModule,
    AnalyticsModule,
    S3Module,
    CoursesModule,
    AssetsModule,
    ContentWorkflowModule,
    StudentModule,
    QuestionBankModule,
    TestBuilderModule,
    StudentTestsModule,
    PaymentsModule,
    BillingModule,
    StudentPlansModule,
    CurrentAffairsModule,
    ContactModule,
    BlogModule,
    SettlementsModule,
    DoubtsModule,
    SupportModule,
    AnnouncementsModule,
    MonitoringModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}

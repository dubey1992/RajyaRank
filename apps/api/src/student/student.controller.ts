import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  joinInstitutionSchema,
  onboardingSchema,
  planItemRescheduleSchema,
  planItemStatusUpdateSchema,
  progressUpdateSchema,
  updateGoalsSchema,
  type JoinInstitution,
  type Onboarding,
  type PlanItemReschedule,
  type PlanItemStatusUpdate,
  type ProgressUpdate,
  type UpdateGoals,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StudentService } from './student.service';
import { StudyPlanService } from './study-plan.service';

/**
 * Student endpoints. Authentication is enforced globally by AccessGuard; there
 * is no @RequirePermission because students hold no staff permission codes —
 * the service verifies the STUDENT account kind and derives ownership from the
 * authenticated principal.
 */
@Controller('student')
export class StudentController {
  constructor(
    private readonly student: StudentService,
    private readonly studyPlan: StudyPlanService,
  ) {}

  @Post('onboarding')
  onboarding(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(onboardingSchema)) body: Onboarding,
  ) {
    return this.student.onboarding(p, body);
  }

  @Post('onboarding/skip')
  skipOnboarding(@CurrentPrincipal() p: Principal) {
    return this.student.skipOnboarding(p);
  }

  @Get('dashboard')
  dashboard(@CurrentPrincipal() p: Principal) {
    return this.student.dashboard(p);
  }

  @Post('institution/join')
  joinInstitution(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(joinInstitutionSchema)) body: JoinInstitution,
  ) {
    return this.student.joinInstitution(p, body);
  }

  @Post('institution/leave')
  leaveInstitution(@CurrentPrincipal() p: Principal) {
    return this.student.leaveInstitution(p);
  }

  @Get('profile/goals')
  getGoals(@CurrentPrincipal() p: Principal) {
    return this.student.getGoals(p);
  }

  @Patch('profile/goals')
  updateGoals(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(updateGoalsSchema)) body: UpdateGoals,
  ) {
    return this.student.updateGoals(p, body);
  }

  @Get('courses')
  myCourses(@CurrentPrincipal() p: Principal) {
    return this.student.myCourses(p);
  }

  @Get('courses/:id/pricing')
  coursePricing(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.student.coursePricing(p, id);
  }

  @Get('institute-courses')
  instituteCourses(@CurrentPrincipal() p: Principal) {
    return this.student.instituteCourses(p);
  }

  @Get('courses/:id/curriculum')
  courseCurriculum(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.student.courseCurriculum(p, id);
  }

  @Get('lessons/:id')
  lesson(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.student.lessonDetail(p, id);
  }

  @Post('lessons/:id/playback-token')
  playback(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.student.playbackToken(p, id);
  }

  @Patch('lessons/:id/progress')
  progress(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(progressUpdateSchema)) body: ProgressUpdate,
  ) {
    return this.student.updateProgress(p, id, body);
  }

  @Post('lessons/:id/bookmark')
  bookmark(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.student.toggleBookmark(p, id);
  }

  @Get('revision')
  revision(@CurrentPrincipal() p: Principal) {
    return this.student.revision(p);
  }

  @Get('current-affairs')
  currentAffairs() {
    return this.student.currentAffairs();
  }

  @Get('weak-topics')
  weakTopics(@CurrentPrincipal() p: Principal) {
    return this.student.weakTopics(p);
  }

  @Get('study-plan/today')
  studyPlanToday(@CurrentPrincipal() p: Principal) {
    return this.studyPlan.today(p);
  }

  @Get('study-plan/week')
  studyPlanWeek(@CurrentPrincipal() p: Principal) {
    return this.studyPlan.week(p);
  }

  @Patch('study-plan/items/:id')
  studyPlanMarkItem(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(planItemStatusUpdateSchema)) body: PlanItemStatusUpdate,
  ) {
    return this.studyPlan.markItem(p, id, body.status);
  }

  @Post('study-plan/items/:id/reschedule')
  studyPlanReschedule(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(planItemRescheduleSchema)) body: PlanItemReschedule,
  ) {
    return this.studyPlan.reschedule(p, id, body.toDate);
  }

  @Post('study-plan/regenerate')
  studyPlanRegenerate(@CurrentPrincipal() p: Principal) {
    return this.studyPlan.regenerate(p);
  }
}

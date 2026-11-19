import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  bulkCustomTopicsSchema,
  bulkImportQuestionsTextSchema,
  createStudentPaperSchema,
  customTopicInputSchema,
  joinInstitutionSchema,
  onboardingSchema,
  personalQuizInputSchema,
  personalQuizQuestionInputSchema,
  planItemRescheduleSchema,
  planItemStatusUpdateSchema,
  progressUpdateSchema,
  submitPersonalQuizAttemptSchema,
  submitStudentPaperAttemptSchema,
  updateCustomTopicSchema,
  updateGoalsSchema,
  uploadIntentSchema,
  completeUploadSchema,
  type BulkCustomTopics,
  type BulkImportQuestionsText,
  type CreateStudentPaper,
  type CustomTopicInput,
  type JoinInstitution,
  type Onboarding,
  type PersonalQuizInput,
  type PersonalQuizQuestionInput,
  type PlanItemReschedule,
  type PlanItemStatusUpdate,
  type ProgressUpdate,
  type SubmitPersonalQuizAttempt,
  type SubmitStudentPaperAttempt,
  type UpdateCustomTopic,
  type UpdateGoals,
  type UploadIntent,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StudentService } from './student.service';
import { StudyPlanService } from './study-plan.service';
import { ReadinessService } from './readiness.service';
import { MistakeDnaService } from './mistake-dna.service';
import { PersonalQuizzesService } from './personal-quizzes.service';
import { StudentPapersService } from './student-papers.service';

// Student uploads are always DOCUMENT (PDF) — unlike the staff
// upload-intents route, assetType is never client-supplied here.
const studentUploadIntentSchema = uploadIntentSchema.omit({ assetType: true });
type StudentUploadIntent = Omit<UploadIntent, 'assetType'>;

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
    private readonly readinessService: ReadinessService,
    private readonly mistakeDnaService: MistakeDnaService,
    private readonly personalQuizzes: PersonalQuizzesService,
    private readonly studentPapers: StudentPapersService,
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

  @Get('readiness')
  readiness(@CurrentPrincipal() p: Principal) {
    return this.readinessService.readiness(p);
  }

  @Get('mistake-dna')
  mistakeDna(@CurrentPrincipal() p: Principal) {
    return this.mistakeDnaService.mistakeDna(p);
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

  @Get('exam-notices')
  examNotices(@CurrentPrincipal() p: Principal) {
    return this.student.examNotices(p);
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

  @Get('study-plan/access-status')
  studyPlanAccessStatus(@CurrentPrincipal() p: Principal) {
    return this.studyPlan.accessStatus(p);
  }

  @Get('study-plan/custom-topics')
  listCustomTopics(@CurrentPrincipal() p: Principal) {
    return this.studyPlan.listCustomTopics(p);
  }

  @Post('study-plan/custom-topics')
  createCustomTopic(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(customTopicInputSchema)) body: CustomTopicInput,
  ) {
    return this.studyPlan.createCustomTopic(p, body);
  }

  @Post('study-plan/custom-topics/bulk')
  bulkCreateCustomTopics(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(bulkCustomTopicsSchema)) body: BulkCustomTopics,
  ) {
    return this.studyPlan.bulkCreateCustomTopics(p, body);
  }

  @Patch('study-plan/custom-topics/:id')
  updateCustomTopic(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCustomTopicSchema)) body: UpdateCustomTopic,
  ) {
    return this.studyPlan.updateCustomTopic(p, id, body);
  }

  @Delete('study-plan/custom-topics/:id')
  deleteCustomTopic(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.studyPlan.deleteCustomTopic(p, id);
  }

  @Get('my-quizzes')
  listPersonalQuizzes(@CurrentPrincipal() p: Principal) {
    return this.personalQuizzes.list(p);
  }

  @Post('my-quizzes')
  createPersonalQuiz(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(personalQuizInputSchema)) body: PersonalQuizInput,
  ) {
    return this.personalQuizzes.create(p, body);
  }

  @Get('my-quizzes/:id')
  personalQuizDetail(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.personalQuizzes.detail(p, id);
  }

  @Delete('my-quizzes/:id')
  deletePersonalQuiz(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.personalQuizzes.deleteQuiz(p, id);
  }

  @Post('my-quizzes/:id/questions')
  addPersonalQuizQuestion(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(personalQuizQuestionInputSchema)) body: PersonalQuizQuestionInput,
  ) {
    return this.personalQuizzes.addQuestion(p, id, body);
  }

  @Post('my-quizzes/:id/questions/bulk-text')
  bulkImportPersonalQuizQuestions(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bulkImportQuestionsTextSchema)) body: BulkImportQuestionsText,
  ) {
    return this.personalQuizzes.bulkImportQuestions(p, id, body.text);
  }

  @Delete('my-quizzes/:id/questions/:questionId')
  deletePersonalQuizQuestion(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Param('questionId') questionId: string) {
    return this.personalQuizzes.deleteQuestion(p, id, questionId);
  }

  @Post('my-quizzes/:id/attempts')
  startPersonalQuizAttempt(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.personalQuizzes.startAttempt(p, id);
  }

  @Post('my-quizzes/attempts/:attemptId/submit')
  submitPersonalQuizAttempt(
    @CurrentPrincipal() p: Principal,
    @Param('attemptId') attemptId: string,
    @Body(new ZodValidationPipe(submitPersonalQuizAttemptSchema)) body: SubmitPersonalQuizAttempt,
  ) {
    return this.personalQuizzes.submitAttempt(p, attemptId, body);
  }

  @Post('my-papers/upload-intents')
  createPaperUploadIntent(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(studentUploadIntentSchema)) body: StudentUploadIntent,
  ) {
    return this.studentPapers.createUploadIntent(p, body);
  }

  @Post('my-papers/assets/:assetId/complete')
  completePaperUpload(
    @CurrentPrincipal() p: Principal,
    @Param('assetId') assetId: string,
    @Body(new ZodValidationPipe(completeUploadSchema)) body: { checksum?: string },
  ) {
    return this.studentPapers.completeUpload(p, assetId, body.checksum);
  }

  @Get('my-papers')
  listStudentPapers(@CurrentPrincipal() p: Principal) {
    return this.studentPapers.list(p);
  }

  @Post('my-papers')
  createStudentPaper(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(createStudentPaperSchema)) body: CreateStudentPaper,
  ) {
    return this.studentPapers.create(p, body);
  }

  @Delete('my-papers/:id')
  deleteStudentPaper(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.studentPapers.deletePaper(p, id);
  }

  @Get('my-papers/:id/download')
  studentPaperDownload(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.studentPapers.downloadUrl(p, id);
  }

  @Post('my-papers/:id/attempts')
  startStudentPaperAttempt(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.studentPapers.startAttempt(p, id);
  }

  @Post('my-papers/attempts/:attemptId/submit')
  submitStudentPaperAttempt(
    @CurrentPrincipal() p: Principal,
    @Param('attemptId') attemptId: string,
    @Body(new ZodValidationPipe(submitStudentPaperAttemptSchema)) body: SubmitStudentPaperAttempt,
  ) {
    return this.studentPapers.submitAttempt(p, attemptId, body);
  }
}

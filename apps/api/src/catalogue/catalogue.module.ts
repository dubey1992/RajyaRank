import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CatalogueController, CatalogueAdminController } from './catalogue.controller';
import { CatalogueAdminService } from './catalogue-admin.service';

@Module({
  imports: [CoursesModule], // for CoursesService.previewData (course-preview verification)
  controllers: [CatalogueController, CatalogueAdminController],
  providers: [CatalogueAdminService],
})
export class CatalogueModule {}

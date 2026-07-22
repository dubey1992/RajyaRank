import { Module } from '@nestjs/common';
import { ContentWorkflowController } from './content-workflow.controller';
import { ContentWorkflowService } from './content-workflow.service';

@Module({ controllers: [ContentWorkflowController], providers: [ContentWorkflowService] })
export class ContentWorkflowModule {}

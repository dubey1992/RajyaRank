import { Module } from '@nestjs/common';
import { DoubtsController } from './doubts.controller';
import { DoubtsService } from './doubts.service';

@Module({ controllers: [DoubtsController], providers: [DoubtsService] })
export class DoubtsModule {}

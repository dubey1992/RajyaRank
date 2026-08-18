import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { DoubtsController } from './doubts.controller';
import { DoubtsService } from './doubts.service';

@Module({ imports: [PaymentsModule], controllers: [DoubtsController], providers: [DoubtsService] })
export class DoubtsModule {}

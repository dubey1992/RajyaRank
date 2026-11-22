import { Module } from '@nestjs/common';
import { ContentProductsAdminController, ContentProductsPublicController } from './content-products.controller';
import { ContentProductsService } from './content-products.service';

@Module({
  controllers: [ContentProductsAdminController, ContentProductsPublicController],
  providers: [ContentProductsService],
})
export class ContentProductsModule {}

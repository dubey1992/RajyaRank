import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetScanService } from './asset-scan.service';

@Module({ controllers: [AssetsController], providers: [AssetsService, AssetScanService] })
export class AssetsModule {}

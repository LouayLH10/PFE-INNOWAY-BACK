import { Module } from '@nestjs/common';
import { PdfDashboardService } from './pdf-dashboard.service';
import { PdfDashboardController } from './pdf-dashboard.controller';

@Module({
  controllers: [PdfDashboardController],
  providers: [PdfDashboardService],
})
export class PdfDashboardModule {}

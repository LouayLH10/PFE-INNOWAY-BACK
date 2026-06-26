import { Test, TestingModule } from '@nestjs/testing';
import { PdfDashboardController } from './pdf-dashboard.controller';
import { PdfDashboardService } from './pdf-dashboard.service';

describe('PdfDashboardController', () => {
  let controller: PdfDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfDashboardController],
      providers: [PdfDashboardService],
    }).compile();

    controller = module.get<PdfDashboardController>(PdfDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

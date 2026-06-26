import { Test, TestingModule } from '@nestjs/testing';
import { PdfDashboardService } from './pdf-dashboard.service';

describe('PdfDashboardService', () => {
  let service: PdfDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfDashboardService],
    }).compile();

    service = module.get<PdfDashboardService>(PdfDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

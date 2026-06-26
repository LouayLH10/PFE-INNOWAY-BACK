import { PartialType } from '@nestjs/mapped-types';
import { CreatePdfDashboardDto } from './create-pdf-dashboard.dto';

export class UpdatePdfDashboardDto extends PartialType(CreatePdfDashboardDto) {}

// pdf-dashboard.controller.ts

import {
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { Response } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';

import { PdfDashboardService } from './pdf-dashboard.service';

@Controller('pdf')
export class PdfDashboardController {
  constructor(
    private readonly pdfService: PdfDashboardService,
  ) {}

  // =====================================
  // GENERATE DASHBOARD PDF
  // =====================================

  @Post('dashboard')
  async generateDashboard(
    @Body()
    body: {
      userId: number;
      year: number;
    },

    @Res()
    res: Response,
  ) {

    const pdf =
      await this.pdfService.generateDashboardPdf(
        body.userId,
        body.year,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename=dashboard-report.pdf',
    });

    res.send(pdf);

  }

  // =====================================
  // SEND DASHBOARD BY EMAIL
  // =====================================

  @Post('send-dashboard')

  @UseInterceptors(
    FileInterceptor('file'),
  )

  async sendDashboard(

    @UploadedFile()
    file: Express.Multer.File,

    @Body('email')
    email: string,

    @Body('subject')
    subject: string,

    @Body('message')
    message: string,

  ) {

    return await this.pdfService.sendDashboardMail(
      email,
      subject,
      message,
      file,
    );

  }
@Post('download-dashboard')
async downloadDashboard(
  @Body()
  body: {
    userId: number;
    year: number;
  },
  @Res() res: Response,
) {

  const pdf =
    await this.pdfService.generateDashboardPdf(
      body.userId,
      body.year,
    );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition':
      `attachment; filename=dashboard-${body.year}.pdf`,
  });

  res.send(pdf);

}
}
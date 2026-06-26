// pdf.controller.ts

import {
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfDashboardService } from './pdf-dashboard.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('pdf')
export class PdfDashboardController {
  constructor(
    private readonly pdfService: PdfDashboardService,
  ) {}

  @Post('dashboard')
  async generateDashboard(
    @Body() body: {
      html: string;
    },
    @Res() res: Response,
  ) {
    const pdf =
      await this.pdfService.generateDashboardPdf(
        body.html,
      );

    res.set({
      'Content-Type':
        'application/pdf',
      'Content-Disposition':
        'attachment; filename=dashboard.pdf',
    });

    res.send(pdf);
  }
    @Post('send-dashboard')
  @UseInterceptors(
    FileInterceptor('file'),
  )
  async sendDashboard(
    @UploadedFile() file: Express.Multer.File,

    @Body('email') email: string,

    @Body('subject') subject: string,

    @Body('message') message: string,
  ) {
    return this.pdfService.sendDashboardMail(
      email,
      subject,
      message,
      file,
    );
  }
}
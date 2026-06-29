// pdf.service.ts

import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PdfDashboardService {
  async generateDashboardPdf(
    dashboardHtml: string,
  ): Promise<Buffer> {
   const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
  ],
});

    const page =
      await browser.newPage();
await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${dashboardHtml}
</body>
</html>
`,   {
        waitUntil: 'networkidle0',
      },);
   
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    return Buffer.from(pdf);
  }
    private transporter =
    nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user:
          process.env.MAIL_USER,

        pass:
          process.env.PASS_MAIL,
      },
    });

  async sendDashboardMail(
    email: string,
    subject: string,
    message: string,
    file: Express.Multer.File,
  ) {
    await this.transporter.sendMail({
      from: process.env.MAIL_USER,

      to: email,

      subject,

      text: message,

      attachments: [
        {
          filename:
            file.originalname,

          content: file.buffer,
        },
      ],
    });

    return {
      success: true,
      message: 'Email sent',
    };
  }
}
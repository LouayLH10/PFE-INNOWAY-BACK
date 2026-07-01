import { Injectable, BadRequestException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PdfDashboardService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.PASS_MAIL,
    },
  });

  async generateDashboardPdf(
    dashboardHtml: string,
  ): Promise<Buffer> {

    let browser;

    // LOCAL
    if (process.env.NODE_ENV !== 'PROD') {
      browser = await puppeteer.launch({
        headless: true,
      });
    }

    // RENDER / VERCEL
    else {
      browser = await puppeteerCore.launch({
        executablePath: await chromium.executablePath(),
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        headless: true,
      });
    }

    try {
      const page = await browser.newPage();

      await page.setContent(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${dashboardHtml}
        </body>
        </html>
        `,
        {
          waitUntil: 'load',
        },
      );

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async sendDashboardMail(
    email: string,
    subject: string,
    message: string,
    file: Express.Multer.File,
  ) {
    if (!email) {
      throw new BadRequestException('Recipient email is required.');
    }

    if (!file) {
      throw new BadRequestException('PDF file is required.');
    }

    await this.transporter.sendMail({
      from: `"InnoWay CRM" <${process.env.MAIL_USER}>`,
      to: email,
      subject,
      text: message,
      attachments: [
        {
          filename: file.originalname ?? 'dashboard.pdf',
          content: file.buffer,
        },
      ],
    });

    return {
      success: true,
      message: 'Email sent successfully.',
    };
  }
}
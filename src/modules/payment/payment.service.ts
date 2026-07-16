import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';

import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number) {
    return await this.prisma.payment.findMany({
      where: {
        invoice: {
          contact: {
            userId,
          },
        },
      },
      include: {
        invoice: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
  }

  private mapPaymentToTemplate(payment: any) {
    return {
      receiptNumber: `REC-${payment.id}`,
      date: new Date(payment.paymentDate).toLocaleDateString(),

      clientName: payment.invoice?.contact?.user?.name || 'N/A',
      clientEmail: payment.invoice?.contact?.user?.email || 'N/A',

      invoiceRef: payment.invoice?.reference,

      amount: payment.amount,
      method: payment.method,
      status: payment.status,
    };
  }

async generatePdfById(id: number,language:string): Promise<Buffer> {
  const payment = await this.prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: {
        include: {
          contact: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }



  const data = this.mapPaymentToTemplate(payment);

  return this.generatePdf(data, language);
}
async generatePdf(
  data: any,
  language: string,
): Promise<Buffer> {

  const templateName =
    language === 'fr'
      ? 'receipt-fr.hbs'
      : 'receipt-en.hbs';

  const templatePath = path.join(
    process.cwd(),
    'src/modules/payment/templates',
    templateName,
  );

  const templateHtml = fs.readFileSync(
    templatePath,
    'utf8',
  );

  const template = handlebars.compile(templateHtml);
  const html = template(data);

  let browser;

  if (process.env.NODE_ENV === 'PROD') {const browser = await puppeteerCore.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ],
});
  } else {
    browser = await puppeteer.launch({
      headless: true,
    });
  }

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'load',
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
}
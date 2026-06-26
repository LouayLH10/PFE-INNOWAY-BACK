import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';

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
async generatePdfById(id: number): Promise<Buffer> {
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

  return this.generatePdf(data);
}
async generatePdf(data: any): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'src/modules/payment/templates/receipt.hbs'
  );

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');

  const template = handlebars.compile(templateHtml);

  const html = template(data);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  await browser.close();

  return Buffer.from(pdf);
}

}

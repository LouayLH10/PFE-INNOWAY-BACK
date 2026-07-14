import { BadRequestException, Injectable } from "@nestjs/common";
import Chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";
import { PrismaService } from "src/prisma/prisma.service";
import puppeteerCore from 'puppeteer-core';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
@Injectable()
export class PdfDashboardService {

   constructor(
      private prisma: PrismaService,
   ){}
private transporter = process.env.NODE_ENV === 'PROD'
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.PASS_MAIL,
      },
    });

async generateDashboardPdf(
  userId: number,
  selectedYear: number,
  language: string,
): Promise<Buffer> {

  // ==========================================
  // FETCH DATA
  // ==========================================

  const [
    invoices,
    projects,
    orders,
    payments,
    deliveryNotes,
  ] = await Promise.all([

    this.prisma.invoice.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

    this.prisma.project.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

    this.prisma.purchaseOrder.findMany({
      where: {
        contact: {
          userId,
        },
      },
      include: {
        items: true,
      },
    }),

    this.prisma.payment.findMany({
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
    }),

    this.prisma.deliveryNote.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

  ]);
 const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });  // ==========================================
  // FILTER YEAR
  // ==========================================

  const filteredInvoices = invoices.filter(
    i =>
      new Date(
        i.createdAt ?? i.createdAt,
      ).getFullYear() === selectedYear,
  );

  const filteredProjects = projects.filter(
    p =>
      new Date(
        p.createdAt,
      ).getFullYear() === selectedYear,
  );

  const filteredOrders = orders.filter(
    o =>
      new Date(
        o.orderDate,
      ).getFullYear() === selectedYear,
  );

  const filteredPayments =
    payments.filter(
      p =>
        new Date(
          p.paymentDate ?? p.paymentDate,
        ).getFullYear() === selectedYear,
    );

  const filteredDeliveryNotes =
    deliveryNotes.filter(
      d =>
        new Date(
          d.createdAt,
        ).getFullYear() === selectedYear,
    );

  // ==========================================
  // KPI
  // ==========================================

  const nbProject =
    filteredProjects.length;

  const nbOrder =
    filteredOrders.length;

  const nbInvoice =
    filteredInvoices.length;

  const nbPayment =
    filteredPayments.length;

  const nbDn =
    filteredDeliveryNotes.length;

  // ==========================================
  // PAYMENT TOTAL / DUE BALANCE
  // ==========================================

  var am = 0;
  let bal = 0;

  filteredPayments.forEach(pay => {

    am += pay.amount;

    bal +=
      pay.invoice?.balanceDue ?? 0;

  });
const amount=this.formatTND(am)
const balance=this.formatTND(bal)  
// ==========================================
  // INVOICE STATUS
  // ==========================================

  const invoiceStats = {

    paid:
      filteredInvoices.filter(
        i => i.status === 'PAID',
      ).length,

    sent:
      filteredInvoices.filter(
        i => i.status === 'SENT',
      ).length,

    cancelled:
      filteredInvoices.filter(
        i =>
          i.status ===
          'CANCELLED',
      ).length,

    draft:
      filteredInvoices.filter(
        i => i.status === 'DRAFT',
      ).length,

  };

  // ==========================================
  // ORDER STATUS
  // ==========================================

  const orderStats = {

    approved:
      filteredOrders.filter(
        o =>
          o.status ===
          'APPROVED',
      ).length,

    pending:
      filteredOrders.filter(
        o =>
          o.status ===
          'PENDING',
      ).length,

    cancelled:
      filteredOrders.filter(
        o =>
          o.status ===
          'CANCELLED',
      ).length,

    recieved:
      filteredOrders.filter(
        o =>
          o.status ===
          'RECEIVED',
      ).length,

  };

  // ==========================================
  // PURCHASED PRODUCTS PER MONTH
  // ==========================================

  const months =
    Array(12).fill(0);

  filteredOrders.forEach(order => {

    const month =
      new Date(
        order.orderDate,
      ).getMonth();

    const totalQty =
      order.items.reduce(
        (sum, item) =>
          sum + item.quantity,
        0,
      );

    months[month] += totalQty;

  });

  const purchacedProd = {

    jan: months[0],
    feb: months[1],
    mar: months[2],
    apr: months[3],
    may: months[4],
    jun: months[5],
    jul: months[6],
    aug: months[7],
    sep: months[8],
    oct: months[9],
    nov: months[10],
    dec: months[11],

  };

  // ==========================================
  // BUILD HTML
  // ==========================================
const clientName=user?.name
const generatedAt = new Date().toLocaleString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const invoicePerMonth = {
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
};

filteredInvoices.forEach(invoice => {

    const month = new Date(invoice.createdAt).getMonth();

    switch (month) {
        case 0: invoicePerMonth.jan++; break;
        case 1: invoicePerMonth.feb++; break;
        case 2: invoicePerMonth.mar++; break;
        case 3: invoicePerMonth.apr++; break;
        case 4: invoicePerMonth.may++; break;
        case 5: invoicePerMonth.jun++; break;
        case 6: invoicePerMonth.jul++; break;
        case 7: invoicePerMonth.aug++; break;
        case 8: invoicePerMonth.sep++; break;
        case 9: invoicePerMonth.oct++; break;
        case 10: invoicePerMonth.nov++; break;
        case 11: invoicePerMonth.dec++; break;
    }

});


const data = {
  year: selectedYear,
clientName,
generatedAt,
  nbProject,
invoicePerMonth,
  nbOrder,

  nbInvoice,

  nbPayment,

  nbDn,

  amount,

  balance,

  invoiceStats,

  orderStats,

  purchacedProd,
};

return this.generatePdf(data, language);

}


async generatePdf(
  data: any,
  language: string,
): Promise<Buffer> {

  const templateName =
    language === 'fr'
      ? 'dashboard-fr.hbs'
      : 'dashboard-en.hbs';

  const templatePath = path.join(
    process.cwd(),
    'src/modules/pdf-dashboard/templates',
    templateName,
  );

  const templateHtml = fs.readFileSync(
    templatePath,
    'utf8',
  );

  const template = handlebars.compile(templateHtml);

  const html = template(data);

  let browser;

  if (process.env.NODE_ENV === 'PROD') {

    browser = await puppeteerCore.launch({

      executablePath:
        await Chromium.executablePath(),

      args: [
        ...Chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],

      headless: true,

    });

  } else {

    browser = await puppeteer.launch({
      headless: true,
    });

  }

  try {

    const page = await browser.newPage();

    await page.setContent(html, {
       waitUntil: "networkidle0",
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
  from:
    process.env.NODE_ENV === 'PROD'
      ? `"InnoWay CRM" <${process.env.SENDER_EMAIL}>`
      : process.env.MAIL_USER,

  to: email,
  subject,
  text: message,
  attachments: [
    {
      filename: file.originalname,
      content: file.buffer,
    },
  ],
});

    return {
      success: true,
      message: 'Email sent successfully.',
    };
  }
private formatTND(amount: number | string): string {
  const value = Number(amount);

  if (isNaN(value)) {
    return "0,000 TND";
  }

  return (
    value
      .toLocaleString("fr-FR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })
      .replace(/\u202F/g, " ")
      .replace(/\u00A0/g, " ") +
    " TND"
  );
}
}


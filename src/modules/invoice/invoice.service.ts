import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';

@Injectable()
export class InvoiceService {

  constructor(private prisma: PrismaService) {}

  // ✅ CREATE
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { contactId,projectId, ...data } = createInvoiceDto;
 const year = new Date().getFullYear();

  // 🔍 récupérer dernier invoice
  const lastInvoice = await this.prisma.invoice.findFirst({
    orderBy: { id: 'desc' },
  });

  let nextNumber = 1;
  
  if (lastInvoice?.reference) {
    const lastNumber = parseInt(lastInvoice.reference.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  const reference = `INV-${year}-${String(nextNumber).padStart(4, '0')}`;

    return await this.prisma.invoice.create({
      data: {
        ...data,
      subTotal: 0,
      taxTotal: 0,
      total: 0,
      balanceDue: 0,
      discountTotal:0,
      reference:reference,
        contact: {
          connect: { id: contactId }, // 🔗 relation
        },
              project: { // ✅ OBLIGATOIRE
        connect: { id: projectId },
      },
      },
      include: {
        contact: true,
      },
    });
  }

  // ✅ FIND ALL
  async findAll() {
    return await this.prisma.invoice.findMany({
      include: {
        contact: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ✅ FIND ONE
  async findOne(id: number) {
    return await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        contact: true,
      },
    });
  }

  // ✅ UPDATE
  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    return await this.prisma.invoice.update({
      where: { id },
      data: updateInvoiceDto,
    });
  }

  // ✅ DELETE
  async remove(id: number) {
    return await this.prisma.invoice.delete({
      where: { id },
    });
  }

  // 🔥 ✅ FIND BY CONTACT ID
  async findByContact(userId: number) {
    return await this.prisma.invoice.findMany({
    where: {
      contact: {
        userId,
         // ✅ simplifié
      },
    },
      include: {
  contact: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true, // 🔥 éviter de retourner tout
            },
          },
        },
      },
        invoiceLignes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
    async changeStatus(id: number) {
  // 1️⃣ récupérer invoice actuel
  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  let newStatus;

  // 2️⃣ logique de transition

  switch (invoice.status) {
    case 'DRAFT' :
      newStatus = 'SENT';
      break;

    case 'SENT':
      newStatus = 'PAID';
      break;



    default:
      throw new Error('Invalid status');
  }

  // 3️⃣ update
  const updatedInvoice = await this.prisma.invoice.update({
    where: { id },
    data: {
      status: newStatus,
    },
  });
  if (newStatus === 'PAID') {
    await this.prisma.payment.create({
      data: {
        amount: updatedInvoice.total,
        status: 'SUCCESS',
        invoice: {
          connect: { id: updatedInvoice.id },
        },
      },
    });
  }
  return updatedInvoice;
}
private mapInvoiceToTemplate(invoiceFromDB: any) {
  return {
    numero: `${invoiceFromDB.reference}`, // ou reference si tu l’as
    date: new Date(invoiceFromDB.createdAt).toLocaleDateString(),

    clientName: invoiceFromDB.contact.user.name,
    clientEmail: invoiceFromDB.contact.user.email,
    clientAdresse: invoiceFromDB.contact.city,

    items: invoiceFromDB.invoiceLignes.map((l) => ({
      description: l.description,
      price: l.unitPrice,
      quantity: l.quantity,
      total: l.totalPrice,
      unity: l.unity,
    })),

    subtotal: invoiceFromDB.subTotal,
    tva: 19, // ou stocké en DB si tu veux
    tvaAmount: invoiceFromDB.taxTotal,
    total: invoiceFromDB.total,
  };
}
async generatePdfById(id: number): Promise<Buffer> {

  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
    include: {
      invoiceLignes: true,
      contact: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const data = this.mapInvoiceToTemplate(invoice);

  return this.generatePdf(data);
}
async generatePdf(data: any): Promise<Buffer> {

  const templatePath = path.join(
    process.cwd(),
    'src/modules/invoice/templates/invoice.hbs' // ✅ changer ici
  );

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');

  const template = handlebars.compile(templateHtml);

  const html = template(data);

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
  const page = await browser.newPage();

  await page.setContent(html);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  const pdfBuffer = Buffer.from(pdf);

  await browser.close();

  return pdfBuffer;
}
}
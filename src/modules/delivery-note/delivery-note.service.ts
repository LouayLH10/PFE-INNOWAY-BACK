import { Injectable } from '@nestjs/common';
import path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
@Injectable()
export class DeliveryNoteService {

  constructor(private prisma: PrismaService) {}

  // ✅ CREATE
  async create(dto: any) {
    const { contactId, deliveryDate, ...data } = dto;

    const year = new Date().getFullYear();

    const last = await this.prisma.deliveryNote.findFirst({
      orderBy: { id: 'desc' },
    });

    let nextNumber = 1;

    if (last?.reference) {
      const lastNumber = parseInt(last.reference.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const reference = `DN-${year}-${String(nextNumber).padStart(4, '0')}`;

    return await this.prisma.deliveryNote.create({
      data: {
        ...data,
        reference,
        deliveryDate: new Date(deliveryDate),

        contact: {
          connect: { id: contactId },
        },
      },
      include: {
        contact: true,
      },
    });
  }

  // ✅ FIND ALL
  async findAll() {
    return this.prisma.deliveryNote.findMany({
      include: {
        contact: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ FIND ONE
  async findOne(id: number) {
    return this.prisma.deliveryNote.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });
  }

  // ✅ DELETE
  async remove(id: number) {
    return this.prisma.deliveryNote.delete({
      where: { id },
    });
  }

  // ✅ FIND BY USER
  async findByUser(userId: number) {
    return this.prisma.deliveryNote.findMany({
      where: {
        contact: {
          userId,
        },
      },
      include: {
        items: true,
        contact: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  private mapDeliveryNoteToTemplate(dn: any) {
  return {
    numero: dn.reference,
    date: new Date(dn.deliveryDate).toLocaleDateString(),

    clientName: dn.contact?.user?.name ?? 'N/A',
    clientEmail: dn.contact?.user?.email ?? 'N/A',
    clientPhone: dn.contact?.phone ?? '',

    location: dn.location,
    status: dn.status,

    items: dn.items.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unity: l.unity,
    })),
  };
}
async generatePdfById(id: number,language:string): Promise<Buffer> {
  const dn = await this.prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      items: true,
      contact: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!dn) {
    throw new Error('Delivery Note not found');
  }

  const data = this.mapDeliveryNoteToTemplate(dn);

  // 🔥 récupérer la langue du propriétaire

  return this.generatePdf(data, language);
}
async generatePdf(
  data: any,
  language: string,
): Promise<Buffer> {
  const templateName =
    language === 'fr'
      ? 'delivery-note-fr.hbs'
      : 'delivery-note-en.hbs';

  const templatePath = path.join(
    process.cwd(),
    'src/modules/delivery-note/templates',
    templateName,
  );

  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const template = handlebars.compile(templateHtml);
  const html = template(data);

  let browser;

  if (process.env.NODE_ENV === 'PROD') {
    const browser = await puppeteerCore.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ],
});
  } else {
    // Local
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
import { Injectable } from '@nestjs/common';
import path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";@Injectable()
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
async generatePdfById(id: number): Promise<Buffer> {

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

  return this.generatePdf(data);
}
async generatePdf(data: any): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'src/modules/delivery-note/templates/delivery-note.hbs' // ✅ ici
  );

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');

  const template = handlebars.compile(templateHtml);

  const html = template(data);

const executablePath = await chromium.executablePath();

console.log("Chromium executable:", executablePath);

const browser = await puppeteer.launch({
  executablePath,
  args: chromium.args,
  headless: true,
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
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/users/entities/user.entity';
import path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
@Injectable()
export class QuoteService {
  constructor(private prisma: PrismaService) {}
  
  // ✅ CREATE
 async create(createQuoteDto: CreateQuoteDto) {
  const { contactId, ...data } = createQuoteDto;

  // 📅 année actuelle
  const year = new Date().getFullYear();

  // 🔍 récupérer dernier quote
  const lastQuote = await this.prisma.quote.findFirst({
    orderBy: { id: 'desc' },
  });

  let nextNumber = 1;
  
  if (lastQuote?.reference) {
    const lastNumber = parseInt(lastQuote.reference.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  // 🧾 format : DEV-2026-0001
  const reference = `DEV-${year}-${String(nextNumber).padStart(4, '0')}`;

  return await this.prisma.quote.create({
    data: {
      ...data,
      reference: reference,
      amount:0,
      totalAmount:0, // 🔥 ajouté ici
      contact: {
        connect: { id: contactId },
      },
    },
    include: {
      contact: true,
    },
  });
}
  // ✅ READ ALL
  async findAll() {
    return await this.prisma.quote.findMany({
      include: {
        contact: true, // 🔗 relation
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ✅ READ ONE
  async findOne(id: number) {
    return await this.prisma.quote.findUnique({
      where: { id },
      include: {
        contact: true,
      },
    });
  }

  // ✅ UPDATE
  async update(id: number, updateQuoteDto: UpdateQuoteDto) {
    const { contactId, ...data } = updateQuoteDto;

    return await this.prisma.quote.update({
      where: { id },
      data: {
        ...data,
        ...(contactId && {
          contact: {
            connect: { id: contactId },
          },
        }),
      },
      include: {
        contact: true,
      },
    });
  }

  // ✅ DELETE
  async remove(id: number) {
    return await this.prisma.quote.delete({
      where: { id },
    });
  }
async findByUser(userId: number) {
  return await this.prisma.quote.findMany({
    where: {
      contact: {
        userId, // ✅ simplifié
      },
    },
    include: {
      quoteligne: true, // 🔥 lignes du quote
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
private mapQuoteToTemplate(quoteFromDB: any) {
  return {
    numero: `${quoteFromDB.reference}`,
    date: new Date(quoteFromDB.createdAt).toLocaleDateString(),

    clientName: quoteFromDB.contact.user.name,
    clientEmail: quoteFromDB.email,
    clientAdresse: quoteFromDB.adresse,

    items: quoteFromDB.quoteligne.map(l => ({
      description: l.description,
      price: l.unitPrice,
      quantity: l.quantity,
      total: l.totalPrice,
      unity:l.unity
    })),

    subtotal: quoteFromDB.amount,
    tva: quoteFromDB.tva,
    tvaAmount: (quoteFromDB.amount * quoteFromDB.tva) / 100,
    total: quoteFromDB.totalAmount,
  };
}
async generatePdfById(id: number,language:string): Promise<Buffer> {

  const quote = await this.prisma.quote.findUnique({
    where: { id },
    include: {
      quoteligne: true,
      contact: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!quote) {
    throw new NotFoundException("Quote not found");
  }

  const data = this.mapQuoteToTemplate(quote);

  // 🔥 récupérer la langue de l'utilisateur

  return this.generatePdf(data, language);
}
async generatePdf(
  data: any,
  language: string,
): Promise<Buffer> {

  const templatePath = path.join(
    process.cwd(),
    "src/modules/quote/templates",
    `quote-${language}.hbs`,
  );

  const templateHtml = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(templateHtml);
  const html = template(data);

  let browser;

  if (process.env.NODE_ENV === "PROD") {
    browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      headless: true,
    });
  }

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "load",
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return Buffer.from(pdf);
}
  async changeStatus(id: number) {
  // 1️⃣ récupérer quote actuel
  const quote = await this.prisma.quote.findUnique({
    where: { id },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  let newStatus;

  // 2️⃣ logique de transition
  switch (quote.status) {
    case 'ON_HOLD':
      newStatus = 'IN_PROGRESS';
      break;

    case 'IN_PROGRESS':
      newStatus = 'READY';
      break;

    case 'READY':
      newStatus = 'READY'; // ou throw error si tu veux bloquer
      break;

    default:
      throw new Error('Invalid status');
  }

  // 3️⃣ update
  return await this.prisma.quote.update({
    where: { id },
    data: {
      status: newStatus,
    },
  });
}
}
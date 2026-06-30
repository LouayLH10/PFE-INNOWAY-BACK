import { Injectable } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
@Injectable()
export class PurchaseOrderService {
  constructor(private prisma: PrismaService) {}

  // ✅ CREATE
  async create(dto: CreatePurchaseOrderDto) {
    const { contactId, ...data } = dto;

    const year = new Date().getFullYear();

    const last = await this.prisma.purchaseOrder.findFirst({
      orderBy: { id: 'desc' },
    });

    let nextNumber = 1;

    if (last?.reference) {
      const lastNumber = parseInt(last.reference.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const reference = `PO-${year}-${String(nextNumber).padStart(4, '0')}`;

    return await this.prisma.purchaseOrder.create({
      data: {
        ...data,
        reference,
        subTotal: 0,
        tax: 0,
        total: 0,
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
    return await this.prisma.purchaseOrder.findMany({
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
    return await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        contact: true,
        items: true,
      },
    });
  }

  // ✅ UPDATE
  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const { contactId, ...data } = dto;

    return await this.prisma.purchaseOrder.update({
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
    return await this.prisma.purchaseOrder.delete({
      where: { id },
    });
  }

  // ✅ FIND BY USER
  async findByUser(userId: number) {
    return await this.prisma.purchaseOrder.findMany({
      where: {
        contact: {
          userId,
        },
      },
      include: {
        items: true,
        contact: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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

  // ✅ MAP TEMPLATE
  private mapToTemplate(po: any) {
    return {
      numero: po.reference,
      date: new Date(po.createdAt).toLocaleDateString(),

      supplierName: po.contact.user.name,
      supplierEmail: po.contact.user.email,
      supplierAddress: po.contact.city,

      items: po.items.map((l) => ({
        description: l.description,
        price: l.unitPrice,
        quantity: l.quantity,
        total: l.totalPrice,
        unity: l.unity,
      })),

      subtotal: po.subTotal,
      tva: 19,
      tvaAmount: po.tax,
      total: po.total,
    };
  }

  // ✅ PDF BY ID
  async generatePdfById(id: number): Promise<Buffer> {
    const po = await this.prisma.purchaseOrder.findUnique({
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

    if (!po) throw new Error('Purchase Order not found');
console.log(po)
    const data = this.mapToTemplate(po);

    return this.generatePdf(data);
  }

  // ✅ GENERATE PDF
  async generatePdf(data: any): Promise<Buffer> {
    const templatePath = path.join(
      process.cwd(),
      'src/modules/purchase-order/templates/purchase-order.hbs'
    );

    const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

    const template = handlebars.compile(htmlTemplate);
    const html = template(data);

  const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: [
    ...chromium.args,
    "--no-sandbox",
    "--disable-setuid-sandbox",
  ],
  headless: true,
});
    const page = await browser.newPage();

    await page.setContent(html);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    return Buffer.from(pdf);
  }

  // ✅ CHANGE STATUS
  async changeStatus(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) throw new Error('Purchase Order not found');

    let newStatus;

    switch (po.status) {
      case 'PENDING':
        newStatus = 'APPROVED';
        break;

      case 'APPROVED':
        newStatus = 'RECEIVED';
        break;

      case 'RECEIVED':
        newStatus = 'RECEIVED';
        break;

      default:
        throw new Error('Invalid status');
    }

    return await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });
  }
}
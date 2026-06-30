import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  // ✅ CREATE
async create(dto: CreateProjectDto) {
  const { contactId, ...data } = dto;

  return await this.prisma.project.create({
    data: {
      ...data,

      startDate: dto.startDate
        ? new Date(dto.startDate)
        : new Date(),

      ...(dto.endDate && {
        endDate: new Date(dto.endDate),
      }),

      contact: {
        connect: { id: contactId },
      },
    },
    include: {
      contact: true,
    },
  });
}

  // ✅ GET ALL
  async findAll() {
    return await this.prisma.project.findMany({
      include: {
        contact: true,
      },

    });
  }

  // ✅ GET ONE
  async findOne(id: number) {
    return await this.prisma.project.findUnique({
      where: { id },
      include: {
        contact: true,
        milestone: true,
        phases: {
          include: {
            deliverables: true,
          },
        },
      },
    });
  }

  // ✅ GET BY USER (via contact.userId 🔥)
  async findByUser(userId: number) {
    return await this.prisma.project.findMany({
      where: {
        contact: {
          userId: userId,
        },
      },
      include: {
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
        milestone:true,
        phases: {
          include: {
            deliverables: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ✅ UPDATE
  async update(id: number, dto: UpdateProjectDto) {
    const { contactId, ...data } = dto;

    return await this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),

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
    return await this.prisma.project.delete({
      where: { id },
    });
  }
    private mapProjectToTemplate(project: any) {
  return {
    title: project.title,
    description: project.description,
    status: project.status,
    startDate: new Date(project.startDate).toLocaleDateString(),
    endDate: project.endDate
      ? new Date(project.endDate).toLocaleDateString()
      : 'N/A',

    clientName: project.contact?.user?.name || 'N/A',
    clientEmail: project.contact?.user?.email || 'N/A',

    phases: project.phases.map((p) => ({
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: new Date(p.startDate).toLocaleDateString(),
      endDate: p.endDate
        ? new Date(p.endDate).toLocaleDateString()
        : 'N/A',

      deliverables: p.deliverables.map((d) => ({
        name: d.name,
        description: d.description,
        status: d.status,
        deadline: new Date(d.deadline).toLocaleDateString(),
      })),
    })),

    milestones: project.milestone.map((m) => ({
      name: m.name,
      description: m.description,
      status: m.status,
      deadline: new Date(m.deadline).toLocaleDateString(),
    })),
  };
}
async generatePdfById(id: number): Promise<Buffer> {
  const project = await this.prisma.project.findUnique({
    where: { id },
    include: {
      contact: {
        include: {
          user: true,
        },
      },
      phases: {
        include: {
          deliverables: true,
        },
      },
      milestone: true,
    },
  });

  if (!project) throw new Error('Project not found');

  const data = this.mapProjectToTemplate(project);

  return this.generatePdf(data);
}
async generatePdf(data: any): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'src/modules/project/templates/project.hbs'
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

  await browser.close();

  return Buffer.from(pdf);
}
}
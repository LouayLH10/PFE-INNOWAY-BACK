import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import type { Response } from 'express';
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, updateInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(+id);
  }
  @Get('contact/:iduser')
findMany(@Param('iduser') userId: string) {

  return this.invoiceService.findByContact(Number(userId));
}
@Patch(':id/status')
changeStatus(
  @Param('id') id: string,

) {
  return this.invoiceService.changeStatus(Number(id));
}
@Get('pdf/:id')
async generate(@Param('id') id: string,@Query('language') language:string, @Res() res: Response) {

  const pdf = await this.invoiceService.generatePdfById(Number(id),language);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=quote-${id}.pdf`,
  });

  res.end(pdf); // 🔥 IMPORTANT
}
}

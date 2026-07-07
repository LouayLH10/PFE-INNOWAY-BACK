import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import type { Response } from 'express';
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}


  @Get('contact/:id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findByUser(+id);
  }
@Get('user/:id')
findByUser(@Param('id') id: string) {
  return this.paymentService.findByUser(Number(id));
}

@Get('pdf/:id')
async generate(@Param('id') id: string,@Query('language') language:string, @Res() res: Response) {
  const pdf = await this.paymentService.generatePdfById(Number(id),language);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=receipt-${id}.pdf`,
  });

  res.end(pdf);
}

}

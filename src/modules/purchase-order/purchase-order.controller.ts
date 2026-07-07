import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Query
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type { Response } from 'express';

@Controller('purchase-orders')
export class PurchaseOrderController {

  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  // ✅ CREATE
  @Post()
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrderService.create(dto);
  }

  // ✅ GET ALL
  @Get()
  findAll() {
    return this.purchaseOrderService.findAll();
  }

  // ✅ GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrderService.findOne(Number(id));
  }

  // ✅ GET BY USER (via contact)
  @Get('contact/:iduser')
  findMany(@Param('iduser') userId: string) {
    return this.purchaseOrderService.findByUser(Number(userId));
  }

  // ✅ UPDATE
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto
  ) {
    return this.purchaseOrderService.update(Number(id), dto);
  }

  // ✅ DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseOrderService.remove(Number(id));
  }

  // ✅ PDF
  @Get('pdf/:id')
  async generate(
    @Param('id') id: string,
    @Query('language') language:string,
    @Res() res: Response
  ) {
    const pdf = await this.purchaseOrderService.generatePdfById(Number(id),language);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=purchase-order-${id}.pdf`
    );

    res.end(pdf);
  }

  // ✅ CHANGE STATUS
  @Patch(':id/status')
  changeStatus(@Param('id') id: string) {
    return this.purchaseOrderService.changeStatus(Number(id));
  }
}
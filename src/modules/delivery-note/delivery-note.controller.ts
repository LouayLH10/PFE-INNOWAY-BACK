import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { DeliveryNoteService } from './delivery-note.service';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import type { Response } from 'express';
@Controller('delivery-note')
export class DeliveryNoteController {
  constructor(private readonly deliveryNoteService: DeliveryNoteService) {}

  @Post()
  create(@Body() createDeliveryNoteDto: CreateDeliveryNoteDto) {
    return this.deliveryNoteService.create(createDeliveryNoteDto);
  }

  @Get()
  findAll() {
    return this.deliveryNoteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryNoteService.findOne(+id);
  }
 @Get('/contact/:id')
  findbyContact(@Param('id') id: string) {
    return this.deliveryNoteService.findByUser(+id);
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryNoteService.remove(+id);
  }
  @Get('pdf/:id')
async generate(@Param('id') id: string, @Query("language") language: string, @Res() res: Response) {

  const pdf = await this.deliveryNoteService.generatePdfById(Number(id), language || "en");

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=delivery-note-${id}.pdf`,
  });

  res.end(pdf);
}
}

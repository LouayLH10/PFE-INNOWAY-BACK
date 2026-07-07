import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, Query } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}
  @Post()
  create(@Body() createDeviDto: CreateQuoteDto) {
    return this.quoteService.create(createDeviDto);
  }

  @Get()
  findAll() {
    return this.quoteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(+id);
  }
@Get('contact/:iduser')
findMany(@Param('iduser') userId: string) {
  return this.quoteService.findByUser(Number(userId));
}

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeviDto: UpdateQuoteDto) {
    return this.quoteService.update(+id, updateDeviDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quoteService.remove(+id);
  }
@Get('pdf/:id')
async generate(@Param('id') id: string,@Query('language') language:string, @Res() res: Response) {

  const pdf = await this.quoteService.generatePdfById(Number(id),language);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=quote-${id}.pdf`,
  });

  res.end(pdf); // 🔥 IMPORTANT
}
@Patch(':id/status')
changeStatus(@Param('id') id: string) {
  return this.quoteService.changeStatus(Number(id));
}
}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContactModule } from './modules/contact/contact.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuoteModule } from './modules/quote/quote.module';
import { QuoteligneModule } from './modules/quoteligne/quoteligne.module';
import { InvoiceligneModule } from './modules/invoiceligne/invoiceligne.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { PurchaseOrderModule } from './modules/purchase-order/purchase-order.module';
import { PurchaseOrderligneModule } from './modules/purchase-orderligne/purchase-orderligne.module';
import { DeliveryNoteModule } from './modules/delivery-note/delivery-note.module';
import { DeliveryNoteligneModule } from './modules/delivery-noteligne/delivery-noteligne.module';
import { ProjectModule } from './modules/project/project.module';
import { PhaseModule } from './modules/phase/phase.module';
import { MilestoneModule } from './modules/milestone/milestone.module';
import { DelivrableModule } from './modules/delivrable/delivrable.module';
import { PaymentModule } from './modules/payment/payment.module';
import { MessageModule } from './modules/message/message.module';
import { MessageGateway } from './modules/message/message.gateway';
import { PdfDashboardModule } from './modules/pdf-dashboard/pdf-dashboard.module';

@Module({
  imports: [ContactModule, UsersModule,AuthModule,QuoteModule, QuoteligneModule, InvoiceligneModule,InvoiceModule,PurchaseOrderModule,PurchaseOrderligneModule,DeliveryNoteModule,DeliveryNoteligneModule, ProjectModule, PhaseModule, MilestoneModule,DelivrableModule,PaymentModule,MessageModule,MessageGateway,PdfDashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

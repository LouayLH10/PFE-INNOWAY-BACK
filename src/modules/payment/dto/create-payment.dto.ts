import { IsNumber, IsString, IsInt, IsDate } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

@IsDate()
paymentDate:Date;

  @IsString()
  status: string;
@IsNumber()
dueBalence:number;
  @IsInt()
  invoiceId: number;

}
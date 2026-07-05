import { BadRequestException, Injectable } from "@nestjs/common";
import Chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";
import { PrismaService } from "src/prisma/prisma.service";
import puppeteerCore from 'puppeteer-core';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PdfDashboardService {

   constructor(
      private prisma: PrismaService,
   ){}
private transporter = process.env.NODE_ENV === 'PROD'
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.PASS_MAIL,
      },
    });

async generateDashboardPdf(
  userId: number,
  selectedYear: number,
): Promise<Buffer> {

  // ==========================================
  // FETCH DATA
  // ==========================================

  const [
    invoices,
    projects,
    orders,
    payments,
    deliveryNotes,
  ] = await Promise.all([

    this.prisma.invoice.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

    this.prisma.project.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

    this.prisma.purchaseOrder.findMany({
      where: {
        contact: {
          userId,
        },
      },
      include: {
        items: true,
      },
    }),

    this.prisma.payment.findMany({
      where: {
        invoice: {
          contact: {
            userId,
          },
        },
      },
      include: {
        invoice: true,
      },
    }),

    this.prisma.deliveryNote.findMany({
      where: {
        contact: {
          userId,
        },
      },
    }),

  ]);

  // ==========================================
  // FILTER YEAR
  // ==========================================

  const filteredInvoices = invoices.filter(
    i =>
      new Date(
        i.createdAt ?? i.createdAt,
      ).getFullYear() === selectedYear,
  );

  const filteredProjects = projects.filter(
    p =>
      new Date(
        p.createdAt,
      ).getFullYear() === selectedYear,
  );

  const filteredOrders = orders.filter(
    o =>
      new Date(
        o.orderDate,
      ).getFullYear() === selectedYear,
  );

  const filteredPayments =
    payments.filter(
      p =>
        new Date(
          p.paymentDate ?? p.paymentDate,
        ).getFullYear() === selectedYear,
    );

  const filteredDeliveryNotes =
    deliveryNotes.filter(
      d =>
        new Date(
          d.createdAt,
        ).getFullYear() === selectedYear,
    );

  // ==========================================
  // KPI
  // ==========================================

  const nbProject =
    filteredProjects.length;

  const nbOrder =
    filteredOrders.length;

  const nbInvoice =
    filteredInvoices.length;

  const nbPayment =
    filteredPayments.length;

  const nbDn =
    filteredDeliveryNotes.length;

  // ==========================================
  // PAYMENT TOTAL / DUE BALANCE
  // ==========================================

  let amount = 0;
  let balance = 0;

  filteredPayments.forEach(pay => {

    amount += pay.amount;

    balance +=
      pay.invoice?.balanceDue ?? 0;

  });

  // ==========================================
  // INVOICE STATUS
  // ==========================================

  const invoiceStats = {

    paid:
      filteredInvoices.filter(
        i => i.status === 'PAID',
      ).length,

    sent:
      filteredInvoices.filter(
        i => i.status === 'SENT',
      ).length,

    cancelled:
      filteredInvoices.filter(
        i =>
          i.status ===
          'CANCELLED',
      ).length,

    draft:
      filteredInvoices.filter(
        i => i.status === 'DRAFT',
      ).length,

  };

  // ==========================================
  // ORDER STATUS
  // ==========================================

  const orderStats = {

    approved:
      filteredOrders.filter(
        o =>
          o.status ===
          'APPROVED',
      ).length,

    pending:
      filteredOrders.filter(
        o =>
          o.status ===
          'PENDING',
      ).length,

    cancelled:
      filteredOrders.filter(
        o =>
          o.status ===
          'CANCELLED',
      ).length,

    recieved:
      filteredOrders.filter(
        o =>
          o.status ===
          'RECEIVED',
      ).length,

  };

  // ==========================================
  // PURCHASED PRODUCTS PER MONTH
  // ==========================================

  const months =
    Array(12).fill(0);

  filteredOrders.forEach(order => {

    const month =
      new Date(
        order.orderDate,
      ).getMonth();

    const totalQty =
      order.items.reduce(
        (sum, item) =>
          sum + item.quantity,
        0,
      );

    months[month] += totalQty;

  });

  const purchacedProd = {

    jan: months[0],
    feb: months[1],
    mar: months[2],
    apr: months[3],
    may: months[4],
    jun: months[5],
    jul: months[6],
    aug: months[7],
    sep: months[8],
    oct: months[9],
    nov: months[10],
    dec: months[11],

  };

  // ==========================================
  // BUILD HTML
  // ==========================================

  const html =
    this.buildDashboardHtml({

      year: selectedYear,

      nbProject,

      nbOrder,

      nbInvoice,

      nbPayment,

      nbDn,

      amount,

      balance,

      invoiceStats,

      orderStats,

      purchacedProd,

    });

  // ==========================================
  // GENERATE PDF
  // ==========================================

  const pdf =
    await this.generatePdf(
      html,
    );

  return pdf;

}
private buildDashboardHtml(data: any): string {

return `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8"/>

<title>Business Dashboard Report</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

@page{
    size:A4 landscape;
    margin:18px;
}

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial,Helvetica,sans-serif;
}

body{

    background:#F5F7FA;
    color:#1F2937;

}

/* ========================= */

.cover{

    height:220px;

    background:linear-gradient(
        135deg,
        #2563EB,
        #4F46E5
    );

    color:white;

    border-radius:18px;

    padding:45px;

    display:flex;

    flex-direction:column;

    justify-content:center;

    margin-bottom:25px;

}

.cover h1{

    font-size:42px;

    margin-bottom:15px;

}

.cover h2{

    font-size:22px;

    font-weight:400;

}

.cover p{

    margin-top:25px;

    font-size:15px;

}

/* ========================= */

.section{

    margin-top:22px;

}

/* ========================= */

.section-title{

    font-size:20px;

    font-weight:bold;

    color:#2563EB;

    margin-bottom:15px;

}

/* ========================= */

.summary{

    background:white;

    border-radius:15px;

    padding:18px;

    box-shadow:0 2px 10px rgba(0,0,0,.08);

    line-height:1.8;

}

/* ========================= */

.kpi-grid{

display:grid;

grid-template-columns:
repeat(3,1fr);

gap:18px;

margin-top:20px;

}

/* ========================= */

.kpi{

background:white;

border-radius:18px;

padding:22px;

display:flex;

justify-content:space-between;

align-items:center;

box-shadow:0 2px 8px rgba(0,0,0,.08);

}

/* ========================= */

.kpi-title{

font-size:14px;

color:#6B7280;

margin-bottom:10px;

}

/* ========================= */

.kpi-value{

font-size:28px;

font-weight:bold;

}

/* ========================= */

.icon{

width:58px;

height:58px;

border-radius:50%;

display:flex;

align-items:center;

justify-content:center;

font-size:26px;

}

/* ========================= */

.blue{

background:#DBEAFE;

color:#2563EB;

}

.green{

background:#D1FAE5;

color:#059669;

}

.orange{

background:#FEF3C7;

color:#D97706;

}

.purple{

background:#EDE9FE;

color:#7C3AED;

}

.red{

background:#FEE2E2;

color:#DC2626;

}

.indigo{

background:#E0E7FF;

color:#4338CA;

}

/* ========================= */

.card{

background:white;

border-radius:18px;

padding:20px;

box-shadow:0 2px 10px rgba(0,0,0,.08);

margin-top:18px;

}

/* ========================= */

table{

width:100%;

border-collapse:collapse;

margin-top:15px;

}

th{

background:#2563EB;

color:white;

padding:12px;

font-size:13px;

}

td{

padding:12px;

border-bottom:1px solid #E5E7EB;

font-size:13px;

}

tbody tr:nth-child(even){

background:#F9FAFB;

}

/* ========================= */

.chart-grid{

display:grid;

grid-template-columns:1fr 1fr;

gap:20px;

margin-top:20px;

}

/* ========================= */

.chart{

height:320px;

background:white;

border-radius:18px;

padding:20px;

box-shadow:0 2px 10px rgba(0,0,0,.08);

}

/* ========================= */

.footer{

margin-top:40px;

font-size:12px;

color:#6B7280;

display:flex;

justify-content:space-between;

}

</style>

</head>

<body>

<!-- ================================= -->

<div class="cover">

<h1>
Business Dashboard Report
</h1>

<h2>
InnoWay ERP
</h2>

<p>

Business Intelligence Report

</p>

<p>

Reporting Year :
<b>${data.year}</b>

</p>

<p>

Generated :
${new Date().toLocaleString()}

</p>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Executive Summary

</div>

<div class="summary">

This report provides a consolidated overview of your business activities,
including project management, procurement, invoicing,
payments and operational performance.

The presented indicators help monitor financial health,
business productivity and operational efficiency.

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Business KPI Overview

</div>

<div class="kpi-grid">

<div class="kpi">

<div>

<div class="kpi-title">

Projects

</div>

<div class="kpi-value">

${data.nbProject}

</div>

</div>

<div class="icon blue">

📁

</div>

</div>

<div class="kpi">

<div>

<div class="kpi-title">

Purchase Orders

</div>

<div class="kpi-value">

${data.nbOrder}

</div>

</div>

<div class="icon orange">

🛒

</div>

</div>

<div class="kpi">

<div>

<div class="kpi-title">

Delivery Notes

</div>

<div class="kpi-value">

${data.nbDn}

</div>

</div>

<div class="icon green">

🚚

</div>

</div>

<div class="kpi">

<div>

<div class="kpi-title">

Invoices

</div>

<div class="kpi-value">

${data.nbInvoice}

</div>

</div>

<div class="icon purple">

🧾

</div>

</div>

<div class="kpi">

<div>

<div class="kpi-title">

Amount Paid

</div>

<div class="kpi-value">

${data.amount} TND

</div>

</div>

<div class="icon indigo">

💳

</div>

</div>

<div class="kpi">

<div>

<div class="kpi-title">

Due Balance

</div>

<div class="kpi-value">

${data.balance} TND

</div>

</div>

<div class="icon red">

⚠️

</div>

</div>

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Financial Overview

</div>

<div class="card">

<table>

<thead>

<tr>

<th>Metric</th>

<th>Value</th>

</tr>

</thead>

<tbody>

<tr>

<td>Total Invoices</td>

<td>${data.nbInvoice}</td>

</tr>

<tr>

<td>Paid</td>

<td>${data.invoiceStats.paid}</td>

</tr>

<tr>

<td>Sent</td>

<td>${data.invoiceStats.sent}</td>

</tr>

<tr>

<td>Draft</td>

<td>${data.invoiceStats.draft}</td>

</tr>

<tr>

<td>Cancelled</td>

<td>${data.invoiceStats.cancelled}</td>

</tr>

<tr>

<td>Amount Paid</td>

<td>${data.amount} TND</td>

</tr>

<tr>

<td>Outstanding Balance</td>

<td>${data.balance} TND</td>

</tr>

</tbody>

</table>

</div>

</div>
<!-- ================================= -->

<div class="section">

<div class="section-title">

Business Analytics

</div>

<div class="chart-grid">

<div class="chart">

<h3
style="
margin-bottom:15px;
font-size:18px;
color:#2563EB;
"
>

Invoice Status

</h3>

<canvas
id="invoiceChart">
</canvas>

</div>

<div class="chart">

<h3
style="
margin-bottom:15px;
font-size:18px;
color:#2563EB;
"
>

Purchase Order Status

</h3>

<canvas
id="orderChart">
</canvas>

</div>

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="card">

<h2
style="
color:#2563EB;
margin-bottom:20px;
"
>

Purchased Products by Month

</h2>

<canvas
id="productChart"
height="120">

</canvas>

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Business Insights

</div>

<div
class="summary"
style="display:grid;
grid-template-columns:1fr 1fr;
gap:25px;">

<div>

<h3
style="
color:#2563EB;
margin-bottom:12px;
">

Performance

</h3>

<ul
style="
line-height:2;
padding-left:20px;
">

<li>

${data.nbProject}
 active projects managed.

</li>

<li>

${data.nbInvoice}
 invoices generated this year.

</li>

<li>

${data.nbOrder}
 purchase orders processed.

</li>

<li>

${data.nbDn}
 delivery notes completed.

</li>

<li>

${data.nbPayment}
 payments received.

</li>

</ul>

</div>

<div>

<h3
style="
color:#2563EB;
margin-bottom:12px;
">

Financial Overview

</h3>

<ul
style="
line-height:2;
padding-left:20px;
">

<li>

Collected Amount :
<b>

${data.amount} TND

</b>

</li>

<li>

Outstanding Balance :

<b>

${data.balance} TND

</b>

</li>

<li>

Paid invoices :

<b>

${data.invoiceStats.paid}

</b>

</li>

<li>

Pending invoices :

<b>

${data.invoiceStats.sent}

</b>

</li>

</ul>

</div>

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Recommendations

</div>

<div class="card">

<ul
style="
line-height:2;
padding-left:22px;
">

<li>

Continue reducing unpaid invoices to improve cash flow.

</li>

<li>

Monitor pending purchase orders regularly.

</li>

<li>

Increase delivery completion performance.

</li>

<li>

Review cancelled invoices to identify recurring issues.

</li>

<li>

Maintain payment collection above 90%.

</li>

</ul>

</div>

</div>

<!-- ================================= -->

<div class="section">

<div class="section-title">

Business Summary

</div>

<div class="card">

<table>

<thead>

<tr>

<th>KPI</th>

<th>Value</th>

</tr>

</thead>

<tbody>

<tr>

<td>Projects</td>

<td>${data.nbProject}</td>

</tr>

<tr>

<td>Purchase Orders</td>

<td>${data.nbOrder}</td>

</tr>

<tr>

<td>Delivery Notes</td>

<td>${data.nbDn}</td>

</tr>

<tr>

<td>Invoices</td>

<td>${data.nbInvoice}</td>

</tr>

<tr>

<td>Payments</td>

<td>${data.nbPayment}</td>

</tr>

<tr>

<td>Total Amount Paid</td>

<td>

${data.amount}

TND

</td>

</tr>

<tr>

<td>Outstanding Balance</td>

<td>

${data.balance}

TND

</td>

</tr>

</tbody>

</table>

</div>

</div>

<!-- ================================= -->

<div class="footer">

<div>

Generated by

<b>

InnoWay ERP

</b>

Business Intelligence Module

</div>

<div>

Generated on

${new Date().toLocaleString()}

</div>

</div>

<!-- ================================= -->

<script>

new Chart(

document.getElementById(
'invoiceChart'
),

{

type:'doughnut',

data:{

labels:[

'Paid',

'Sent',

'Draft',

'Cancelled'

],

datasets:[{

data:[

${data.invoiceStats.paid},

${data.invoiceStats.sent},

${data.invoiceStats.draft},

${data.invoiceStats.cancelled}

],

backgroundColor:[

'#10B981',

'#3B82F6',

'#F59E0B',

'#EF4444'

]

}]

},

options:{

responsive:true,

plugins:{

legend:{

position:'bottom'

}

}

}

}

);

new Chart(

document.getElementById(
'orderChart'
),

{

type:'bar',

data:{

labels:[

'Approved',

'Pending',

'Received',

'Cancelled'

],

datasets:[{

label:'Orders',

data:[

${data.orderStats.approved},

${data.orderStats.pending},

${data.orderStats.recieved},

${data.orderStats.cancelled}

],

backgroundColor:[

'#2563EB',

'#F59E0B',

'#10B981',

'#EF4444'

]

}]

},

options:{

responsive:true,

plugins:{

legend:{

display:false

}

}

}

}

);

new Chart(

document.getElementById(
'productChart'
),

{

type:'line',

data:{

labels:[

'Jan',

'Feb',

'Mar',

'Apr',

'May',

'Jun',

'Jul',

'Aug',

'Sep',

'Oct',

'Nov',

'Dec'

],

datasets:[{

label:'Purchased Products',

data:[

${data.purchacedProd.jan},

${data.purchacedProd.feb},

${data.purchacedProd.mar},

${data.purchacedProd.apr},

${data.purchacedProd.may},

${data.purchacedProd.jun},

${data.purchacedProd.jul},

${data.purchacedProd.aug},

${data.purchacedProd.sep},

${data.purchacedProd.oct},

${data.purchacedProd.nov},

${data.purchacedProd.dec}

],

borderColor:'#2563EB',

backgroundColor:'rgba(37,99,235,.15)',

fill:true,

tension:.35

}]

},

options:{

responsive:true,

plugins:{

legend:{

display:false

}

}

}

}

);

</script>

</body>

</html>

`
}
private async generatePdf(
  html: string,
): Promise<Buffer> {

  let browser;

  // =========================================
  // LOCAL
  // =========================================

  if (process.env.NODE_ENV !== 'PROD') {

    browser = await puppeteer.launch({

      headless: true,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],

    });

  }

  // =========================================
  // PRODUCTION (Vercel / Render)
  // =========================================

  else {

    browser = await puppeteerCore.launch({

      executablePath:
        await Chromium.executablePath(),

      args: [
        ...Chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],

      headless: true,

    });

  }

  try {

    const page =
      await browser.newPage();

    // Taille A4 paysage
    await page.setViewport({

      width: 1400,

      height: 900,

      deviceScaleFactor: 2,

    });

    // Charger le HTML
    await page.setContent(

      html,

      {

        waitUntil: 'networkidle0',

      },

    );

    // Attendre que les graphiques soient dessinés
    await page.evaluate(() => {

      return new Promise<void>(
        resolve => {

          setTimeout(() => {

            resolve();

          }, 1500);

        },
      );

    });

    // Génération PDF
const pdf = await page.pdf({

  format: 'A4',

  landscape: true,

  printBackground: true,

  displayHeaderFooter: true,

  headerTemplate: `
    <div style="
      width:100%;
      font-size:10px;
      text-align:center;
      color:#666;
    ">
      <span>InnoWay ERP - Business Intelligence Dashboard</span>
    </div>
  `,

  footerTemplate: `
    <div style="
      width:100%;
      font-size:10px;
      padding:0 20px;
      color:#666;
      display:flex;
      justify-content:space-between;
    ">
      <span>Generated by InnoWay ERP</span>
      <span class="pageNumber"></span> /
      <span class="totalPages"></span>
    </div>
  `,

  margin: {
    top: "25mm",
    bottom: "20mm",
    left: "12mm",
    right: "12mm",
  },

});

    return Buffer.from(pdf);

  }

  finally {

    await browser.close();

  }

}
 async sendDashboardMail(
    email: string,
    subject: string,
    message: string,
    file: Express.Multer.File,
  ) {
    if (!email) {
      throw new BadRequestException('Recipient email is required.');
    }

    if (!file) {
      throw new BadRequestException('PDF file is required.');
    }

await this.transporter.sendMail({
  from:
    process.env.NODE_ENV === 'PROD'
      ? `"InnoWay CRM" <${process.env.SENDER_EMAIL}>`
      : process.env.MAIL_USER,

  to: email,
  subject,
  text: message,
  attachments: [
    {
      filename: file.originalname,
      content: file.buffer,
    },
  ],
});

    return {
      success: true,
      message: 'Email sent successfully.',
    };
  }
}


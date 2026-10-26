import { getInvoiceHTML } from './src/utils/invoice.js';

const html = getInvoiceHTML('service_parts', {
  id: 35,
  vehicle_id: 'TT001',
  user_name: 'Shoeb Khan',
  user_phone: '7667892026',
  service_type: 'General Periodic Service & Tuning',
  cost: '1550',
  billed_to: 'rider',
  payment_status: 'paid',
  parts_replaced: 'FRONT LIGHT SET (₹1200)',
  issue_description: 'Headlight and wiring fix'
});

const headerMatch = html.match(/class="invoice-date">([^<]+)<\/div>/g);
console.log("Header invoice date tags:", headerMatch);

const metaMatch = html.match(/class="meta-item">([^<]+<strong>[^<]+<\/strong>)<\/div>/g);
console.log("Meta items:", metaMatch);

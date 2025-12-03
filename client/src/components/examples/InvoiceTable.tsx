import { InvoiceTable } from '../finance/InvoiceTable';
import { mockInvoices } from '@/lib/mock-data';

export default function InvoiceTableExample() {
  return <InvoiceTable invoices={mockInvoices} />;
}

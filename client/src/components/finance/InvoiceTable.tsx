import { Download, Eye, MoreHorizontal, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InvoiceStatus } from '@/lib/types';

interface InvoiceWithAccount {
  id: string;
  amount: string;
  status: InvoiceStatus;
  dueDate?: string | null;
  accountName?: string;
}

interface InvoiceTableProps {
  invoices: InvoiceWithAccount[];
  title?: string;
  showAccount?: boolean;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export function InvoiceTable({ invoices, title = 'Invoices', showAccount = true }: InvoiceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              {showAccount && <TableHead>Account</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const status = statusConfig[invoice.status];
              const isOverdue = invoice.status === 'overdue';
              const amount = parseFloat(invoice.amount) || 0;

              return (
                <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                  <TableCell className="font-medium">INV-{invoice.id.slice(0, 8)}</TableCell>
                  {showAccount && (
                    <TableCell>{invoice.accountName || 'N/A'}</TableCell>
                  )}
                  <TableCell className="font-semibold">
                    {amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className={isOverdue ? 'text-destructive' : ''}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => console.log('View invoice', invoice.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log('Download invoice', invoice.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        {invoice.status === 'draft' && (
                          <DropdownMenuItem onClick={() => console.log('Send invoice', invoice.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Send
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

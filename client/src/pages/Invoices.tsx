import { useState } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { mockInvoices } from '@/lib/mock-data';
import { DollarSign, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/types';

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch = invoice.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // todo: remove mock functionality
  const totalPaid = mockInvoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = mockInvoices.filter((i) => i.status === 'sent').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = mockInvoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);
  const totalDraft = mockInvoices.filter((i) => i.status === 'draft').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Invoices</h1>
          <p className="text-muted-foreground">Manage billing and payments</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button data-testid="button-add-invoice">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Paid"
          value={totalPaid}
          icon={CheckCircle2}
          format="currency"
        />
        <MetricCard
          title="Pending"
          value={totalPending}
          icon={Clock}
          format="currency"
        />
        <MetricCard
          title="Overdue"
          value={totalOverdue}
          icon={AlertCircle}
          format="currency"
        />
        <MetricCard
          title="Draft"
          value={totalDraft}
          icon={DollarSign}
          format="currency"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-invoices"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <InvoiceTable invoices={filteredInvoices} />
    </div>
  );
}

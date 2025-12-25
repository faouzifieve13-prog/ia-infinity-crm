// Qonto API integration for quote generation
// API Documentation: https://docs.qonto.com/api-reference/business-api/

const QONTO_API_BASE = 'https://thirdparty.qonto.com/v2';

interface QontoQuoteItem {
  title: string;
  description?: string;
  quantity: string;
  unit?: string;
  unit_price: {
    value: string;
    currency: string;
  };
  vat_rate: string;
}

interface QontoQuoteRequest {
  client_id: string;
  issue_date: string;
  expiry_date: string;
  number?: string;
  terms_and_conditions: string;
  currency: string;
  header?: string;
  footer?: string;
  discount?: {
    type: 'percentage' | 'absolute';
    value: string;
  };
  items: QontoQuoteItem[];
}

interface QontoQuoteResponse {
  id: string;
  number: string;
  status: string;
  quote_url?: string;
  total_amount: {
    value: string;
    currency: string;
  };
  issue_date: string;
  expiry_date: string;
}

interface QontoClient {
  id: string;
  name: string;
  email?: string;
  locale?: string;
  tax_identification_number?: string;
}

interface QontoClientRequest {
  name: string;
  type: 'company' | 'individual';
  email?: string;
  locale: string;
  tax_identification_number: string;
  currency?: string;
  billing_address: {
    street_address: string;
    city: string;
    zip_code: string;
    country_code: string;
  };
}

function getQontoHeaders(): HeadersInit {
  const login = process.env.QONTO_LOGIN;
  const secretKey = process.env.QONTO_ACCESS_TOKEN || process.env.QONTO_API_KEY;
  
  if (!login || !secretKey) {
    throw new Error('Configuration Qonto manquante. Veuillez configurer QONTO_LOGIN et QONTO_ACCESS_TOKEN.');
  }
  
  return {
    'Authorization': `${login}:${secretKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

export async function testQontoConnection(): Promise<{ connected: boolean; error?: string; organization?: string }> {
  try {
    const login = process.env.QONTO_LOGIN;
    const secretKey = process.env.QONTO_ACCESS_TOKEN || process.env.QONTO_API_KEY;
    
    if (!login || !secretKey) {
      return { connected: false, error: 'Configuration Qonto manquante' };
    }

    console.log(`Qonto auth test - login: ${login?.substring(0, 10)}...`);

    const response = await fetch(`${QONTO_API_BASE}/organization`, {
      method: 'GET',
      headers: getQontoHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Qonto auth error: ${response.status} - ${errorText}`);
      return { 
        connected: false, 
        error: `Erreur API Qonto: ${response.status}` 
      };
    }

    const data = await response.json();
    return { 
      connected: true, 
      organization: data.organization?.legal_name || data.organization?.name 
    };
  } catch (error: any) {
    console.log(`Qonto connection error: ${error.message}`);
    return { 
      connected: false, 
      error: error.message || 'Erreur de connexion à Qonto' 
    };
  }
}

export async function getQontoClients(): Promise<QontoClient[]> {
  const response = await fetch(`${QONTO_API_BASE}/clients`, {
    method: 'GET',
    headers: getQontoHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur API Qonto: ${response.status}`);
  }

  const data = await response.json();
  return data.clients || [];
}

export async function createQontoClient(clientData: QontoClientRequest): Promise<QontoClient> {
  const response = await fetch(`${QONTO_API_BASE}/clients`, {
    method: 'POST',
    headers: getQontoHeaders(),
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur création client Qonto:', JSON.stringify(errorData, null, 2));
    throw new Error(`Erreur création client Qonto: ${response.status}`);
  }

  const data = await response.json();
  return data.client || data;
}

export async function updateQontoClient(clientId: string, updates: Partial<QontoClientRequest>): Promise<QontoClient> {
  const response = await fetch(`${QONTO_API_BASE}/clients/${clientId}`, {
    method: 'PATCH',
    headers: getQontoHeaders(),
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur mise à jour client Qonto:', JSON.stringify(errorData, null, 2));
    throw new Error(`Erreur mise à jour client Qonto: ${response.status}`);
  }

  const data = await response.json();
  return data.client || data;
}

export async function findOrCreateQontoClient(name: string, email?: string): Promise<string> {
  const clients = await getQontoClients();
  
  let existingClient = clients.find(c => 
    c.name.toLowerCase() === name.toLowerCase() || 
    (email && c.email?.toLowerCase() === email.toLowerCase())
  );

  if (existingClient) {
    if (!existingClient.locale || !existingClient.tax_identification_number) {
      try {
        await updateQontoClient(existingClient.id, {
          locale: 'fr',
          tax_identification_number: '00000000000000'
        });
      } catch (e) {
        console.log('Impossible de mettre à jour le client existant, création d\'un nouveau');
        existingClient = undefined;
      }
    }
    
    if (existingClient) {
      return existingClient.id;
    }
  }

  const uniqueName = existingClient ? `${name} - ${Date.now()}` : name;
  
  const newClient = await createQontoClient({
    name: uniqueName,
    type: 'company',
    email: email,
    locale: 'fr',
    tax_identification_number: '00000000000000',
    currency: 'EUR',
    billing_address: {
      street_address: 'Adresse non renseignée',
      city: 'Paris',
      zip_code: '75001',
      country_code: 'FR'
    }
  });

  return newClient.id;
}

export async function createQontoQuote(quoteData: {
  clientName: string;
  clientEmail?: string;
  issueDate: string;
  expiryDate: string;
  quoteNumber?: string;
  items: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate: number;
  }>;
  discount?: {
    type: 'percentage' | 'absolute';
    value: number;
  };
  header?: string;
  footer?: string;
  termsAndConditions?: string;
}): Promise<QontoQuoteResponse> {
  const clientId = await findOrCreateQontoClient(quoteData.clientName, quoteData.clientEmail);

  const request: QontoQuoteRequest = {
    client_id: clientId,
    issue_date: quoteData.issueDate,
    expiry_date: quoteData.expiryDate,
    currency: 'EUR',
    terms_and_conditions: quoteData.termsAndConditions || 'Conditions générales de vente applicables.',
    items: quoteData.items.map(item => ({
      title: item.title,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit || 'unit',
      unit_price: {
        value: item.unitPrice.toFixed(2),
        currency: 'EUR'
      },
      vat_rate: (item.vatRate / 100).toFixed(2)
    }))
  };

  if (quoteData.quoteNumber) {
    request.number = quoteData.quoteNumber;
  }
  if (quoteData.header) {
    request.header = quoteData.header;
  }
  if (quoteData.footer) {
    request.footer = quoteData.footer;
  }
  if (quoteData.discount) {
    request.discount = {
      type: quoteData.discount.type,
      value: quoteData.discount.value.toString()
    };
  }

  const response = await fetch(`${QONTO_API_BASE}/quotes`, {
    method: 'POST',
    headers: getQontoHeaders(),
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur création devis Qonto:', JSON.stringify(errorData, null, 2));
    throw new Error(`Erreur création devis Qonto: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function getQontoQuotes(): Promise<QontoQuoteResponse[]> {
  const response = await fetch(`${QONTO_API_BASE}/quotes`, {
    method: 'GET',
    headers: getQontoHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur récupération devis: ${response.status}`);
  }

  const data = await response.json();
  return data.quotes || [];
}

export async function getQontoQuoteById(quoteId: string): Promise<QontoQuoteResponse> {
  const response = await fetch(`${QONTO_API_BASE}/quotes/${quoteId}`, {
    method: 'GET',
    headers: getQontoHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur récupération devis: ${response.status}`);
  }

  return await response.json();
}

// Finance/Banking interfaces
interface QontoBankAccount {
  slug: string;
  iban: string;
  bic: string;
  currency: string;
  balance: number;
  balance_cents: number;
  authorized_balance: number;
  authorized_balance_cents: number;
  name?: string;
}

interface QontoOrganization {
  slug: string;
  legal_name?: string;
  name?: string;
  bank_accounts: QontoBankAccount[];
}

interface QontoTransaction {
  transaction_id: string;
  amount: number;
  amount_cents: number;
  side: 'debit' | 'credit';
  operation_type: string;
  currency: string;
  label: string;
  settled_at: string;
  emitted_at: string;
  status: string;
  note?: string;
  reference?: string;
  category?: string;
}

interface QontoTransactionsResponse {
  transactions: QontoTransaction[];
  meta: {
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface QontoFinanceOverview {
  balance: number;
  authorizedBalance: number;
  currency: string;
  iban: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthName: string;
  organizationName: string;
  transactionCount: number;
}

export async function getQontoOrganization(): Promise<QontoOrganization> {
  const login = process.env.QONTO_LOGIN;
  
  const response = await fetch(`${QONTO_API_BASE}/organizations/${login}`, {
    method: 'GET',
    headers: getQontoHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur récupération organisation: ${response.status}`);
  }

  const data = await response.json();
  return data.organization;
}

export async function getQontoTransactions(iban: string, options?: {
  settledAtFrom?: string;
  settledAtTo?: string;
  status?: string[];
  side?: ('debit' | 'credit')[];
  perPage?: number;
  currentPage?: number;
}): Promise<QontoTransactionsResponse> {
  const params = new URLSearchParams();
  params.append('iban', iban);
  
  if (options?.settledAtFrom) {
    params.append('settled_at_from', options.settledAtFrom);
  }
  if (options?.settledAtTo) {
    params.append('settled_at_to', options.settledAtTo);
  }
  if (options?.status) {
    options.status.forEach(s => params.append('status[]', s));
  }
  if (options?.side) {
    options.side.forEach(s => params.append('side[]', s));
  }
  params.append('per_page', (options?.perPage || 100).toString());
  params.append('current_page', (options?.currentPage || 1).toString());
  params.append('sort_by', 'settled_at:desc');

  const response = await fetch(`${QONTO_API_BASE}/transactions?${params.toString()}`, {
    method: 'GET',
    headers: getQontoHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Qonto transactions error:', response.status, errorData);
    throw new Error(errorData.message || `Erreur récupération transactions: ${response.status}`);
  }

  return await response.json();
}

export async function getQontoFinanceOverview(): Promise<QontoFinanceOverview> {
  // Get organization with bank accounts
  const org = await getQontoOrganization();
  
  if (!org.bank_accounts || org.bank_accounts.length === 0) {
    throw new Error('Aucun compte bancaire trouvé');
  }

  const mainAccount = org.bank_accounts[0];
  
  // Get current month date range
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const settledAtFrom = firstDayOfMonth.toISOString().split('T')[0];
  const settledAtTo = lastDayOfMonth.toISOString().split('T')[0];

  // Fetch all completed transactions for the month using IBAN
  const transactionsData = await getQontoTransactions(mainAccount.iban, {
    settledAtFrom,
    settledAtTo,
    status: ['completed'],
    perPage: 100
  });

  // Calculate income and expenses
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const txn of transactionsData.transactions) {
    if (txn.side === 'credit') {
      monthlyIncome += txn.amount;
    } else if (txn.side === 'debit') {
      monthlyExpenses += txn.amount;
    }
  }

  // Get month name in French
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const monthName = monthNames[now.getMonth()];

  return {
    balance: mainAccount.balance,
    authorizedBalance: mainAccount.authorized_balance,
    currency: mainAccount.currency,
    iban: mainAccount.iban,
    monthlyIncome,
    monthlyExpenses,
    monthName,
    organizationName: org.legal_name || org.name || 'Organisation',
    transactionCount: transactionsData.meta.total_count
  };
}

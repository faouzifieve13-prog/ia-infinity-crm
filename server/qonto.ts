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
  discount?: {
    type: 'percentage' | 'absolute';
    value: string;
  };
}

interface QontoQuoteRequest {
  client_id: string;
  issue_date: string;
  expiry_date: string;
  number?: string;
  terms_and_conditions?: string;
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
  address?: {
    street?: string;
    city?: string;
    zip_code?: string;
    country?: string;
  };
}

interface QontoClientRequest {
  name: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    zip_code?: string;
    country?: string;
  };
  currency?: string;
}

function getQontoHeaders(): HeadersInit {
  // Qonto uses login:secret-key format for API authentication
  // Format: slug:secret-key (e.g., ia-infinity-3253:10c0d600c9fc90c36c0d80ad1351bfe7)
  const login = process.env.QONTO_LOGIN;
  const secretKey = process.env.QONTO_ACCESS_TOKEN || process.env.QONTO_API_KEY;
  
  if (!login || !secretKey) {
    throw new Error('QONTO_LOGIN et QONTO_ACCESS_TOKEN doivent être configurés');
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
      return { connected: false, error: 'QONTO_LOGIN et clé secrète non configurés' };
    }

    // Test connection by fetching organization info
    const response = await fetch(`${QONTO_API_BASE}/organization`, {
      method: 'GET',
      headers: getQontoHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        connected: false, 
        error: errorData.message || `Erreur API Qonto: ${response.status}` 
      };
    }

    const data = await response.json();
    return { 
      connected: true, 
      organization: data.organization?.legal_name || data.organization?.name 
    };
  } catch (error: any) {
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
    throw new Error(errorData.message || `Erreur création client Qonto: ${response.status}`);
  }

  const data = await response.json();
  return data.client;
}

export async function findOrCreateQontoClient(name: string, email?: string): Promise<string> {
  // First try to find existing client
  const clients = await getQontoClients();
  const existingClient = clients.find(c => 
    c.name.toLowerCase() === name.toLowerCase() || 
    (email && c.email?.toLowerCase() === email.toLowerCase())
  );

  if (existingClient) {
    return existingClient.id;
  }

  // Create new client if not found
  const newClient = await createQontoClient({
    name,
    email,
    currency: 'EUR'
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
  // Find or create client in Qonto
  const clientId = await findOrCreateQontoClient(quoteData.clientName, quoteData.clientEmail);

  // Prepare quote request
  const request: QontoQuoteRequest = {
    client_id: clientId,
    issue_date: quoteData.issueDate,
    expiry_date: quoteData.expiryDate,
    currency: 'EUR',
    items: quoteData.items.map(item => ({
      title: item.title,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit || 'unit',
      unit_price: {
        value: item.unitPrice.toFixed(2),
        currency: 'EUR'
      },
      // Qonto API expects vat_rate as decimal (0.20 for 20%), input is percentage (20)
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
  if (quoteData.termsAndConditions) {
    request.terms_and_conditions = quoteData.termsAndConditions;
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
    console.error('Qonto quote creation error:', errorData);
    throw new Error(errorData.message || `Erreur création devis Qonto: ${response.status}`);
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

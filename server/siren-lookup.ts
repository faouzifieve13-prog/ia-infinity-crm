// SIREN/SIRET lookup using French public APIs
// Uses Entreprise API (data.gouv.fr) for company information
// and attempts to fetch logos from various sources

interface CompanyInfo {
  siren: string;
  siret?: string;
  name: string;
  legalForm?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  activity?: string;
  logoUrl?: string;
}

export async function lookupBySiren(siren: string): Promise<CompanyInfo | null> {
  // Clean the SIREN (remove spaces and dashes)
  const cleanSiren = siren.replace(/[\s-]/g, '');
  
  // Extract just the SIREN (first 9 digits) if full SIRET provided
  const sirenNumber = cleanSiren.substring(0, 9);
  
  if (sirenNumber.length !== 9 || !/^\d+$/.test(sirenNumber)) {
    throw new Error('SIREN invalide. Doit contenir 9 chiffres.');
  }
  
  try {
    // Use the French government API for company lookup
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${sirenNumber}&page=1&per_page=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const company = data.results[0];
    const siege = company.siege || {};
    
    // Build company info
    const companyInfo: CompanyInfo = {
      siren: company.siren || sirenNumber,
      siret: siege.siret,
      name: company.nom_complet || company.nom_raison_sociale || '',
      legalForm: company.nature_juridique || '',
      address: siege.adresse || '',
      postalCode: siege.code_postal || '',
      city: siege.libelle_commune || '',
      activity: company.activite_principale || siege.activite_principale || '',
    };
    
    // Try to fetch logo from Clearbit (free tier)
    const logoUrl = await tryGetLogo(companyInfo.name, companyInfo.siren);
    if (logoUrl) {
      companyInfo.logoUrl = logoUrl;
    }
    
    return companyInfo;
  } catch (error: any) {
    console.error('SIREN lookup error:', error);
    throw new Error(`Erreur lors de la recherche: ${error.message}`);
  }
}

async function tryGetLogo(companyName: string, siren: string): Promise<string | null> {
  // Try multiple logo sources
  
  // 1. Try Clearbit Logo API (free, no auth needed for basic usage)
  const domain = guessDomain(companyName);
  if (domain) {
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    try {
      const response = await fetch(clearbitUrl, { method: 'HEAD' });
      if (response.ok) {
        return clearbitUrl;
      }
    } catch {
      // Clearbit logo not found, continue
    }
  }
  
  // 2. Try to find logo through Pappers (if available)
  // Note: Pappers requires API key for logos
  
  // 3. Return null if no logo found
  return null;
}

function guessDomain(companyName: string): string | null {
  // Clean and simplify company name to guess domain
  const cleaned = companyName
    .toLowerCase()
    .replace(/\s*(sarl|sas|sa|eurl|ei|sasu|sci|snc)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  
  if (!cleaned || cleaned.length < 2) {
    return null;
  }
  
  // Try common TLDs
  return `${cleaned}.fr`;
}

export async function searchCompanies(query: string): Promise<CompanyInfo[]> {
  try {
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=5`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    return data.results.map((company: any) => {
      const siege = company.siege || {};
      return {
        siren: company.siren,
        siret: siege.siret,
        name: company.nom_complet || company.nom_raison_sociale || '',
        legalForm: company.nature_juridique || '',
        address: siege.adresse || '',
        postalCode: siege.code_postal || '',
        city: siege.libelle_commune || '',
        activity: company.activite_principale || siege.activite_principale || '',
      };
    });
  } catch (error: any) {
    console.error('Company search error:', error);
    throw new Error(`Erreur lors de la recherche: ${error.message}`);
  }
}

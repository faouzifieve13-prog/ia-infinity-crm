import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please check AI_INTEGRATIONS_OPENAI_API_KEY.');
    }
    openaiClient = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

export interface Activity {
  type: string;
  description: string;
  createdAt: Date;
}

export interface ScopeGenerationResult {
  objectScope: string;
  summary: string;
  keyPoints: string[];
}

export async function generateContractScope(
  activities: Activity[],
  contractType: 'audit' | 'prestation' | 'formation' | 'suivi' | 'sous_traitance',
  clientName: string,
  clientCompany?: string
): Promise<ScopeGenerationResult> {
  if (!activities || activities.length === 0) {
    throw new Error('Aucune activité trouvée pour générer le scope du contrat');
  }

  const activitiesText = activities
    .map(a => `[${a.type}] ${a.description}`)
    .join('\n\n');

  const contractTypeLabels: Record<string, string> = {
    audit: "Contrat d'Audit IA",
    prestation: "Contrat de Prestation IA",
    formation: "Contrat de Formation IA",
    suivi: "Contrat de Suivi IA",
    sous_traitance: "Contrat de Sous-Traitance",
  };

  const prompt = `Tu es un expert en rédaction de contrats commerciaux B2B pour une agence spécialisée en IA (Intelligence Artificielle).

Analyse les notes de réunion et compte-rendus suivants concernant le client "${clientCompany || clientName}" :

---
${activitiesText}
---

Sur la base de ces informations, rédige l'objet du contrat (objectScope) pour un ${contractTypeLabels[contractType] || 'contrat'}.

L'objet du contrat doit :
- Être professionnel et précis
- Résumer clairement les besoins identifiés du client
- Décrire les prestations qui seront fournies
- Être rédigé à la troisième personne
- Faire entre 3 et 6 phrases

Réponds uniquement au format JSON suivant :
{
  "objectScope": "Description détaillée de l'objet du contrat...",
  "summary": "Résumé en une phrase du projet",
  "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
}`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en rédaction de contrats commerciaux B2B. Tu réponds uniquement en JSON valide.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Pas de réponse de l\'IA');
    }

    const result = JSON.parse(content) as ScopeGenerationResult;
    
    if (!result.objectScope) {
      throw new Error('L\'IA n\'a pas généré d\'objet de contrat');
    }

    return result;
  } catch (error: any) {
    console.error('AI scope generation error:', error);
    throw new Error(`Erreur lors de la génération du scope: ${error.message}`);
  }
}

export async function summarizeMeetingNotes(notes: string): Promise<string> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant commercial. Résume les notes de réunion de manière concise et professionnelle en français.',
        },
        {
          role: 'user',
          content: `Résume ces notes de réunion en 2-3 phrases clés :\n\n${notes}`,
        },
      ],
      max_completion_tokens: 256,
    });

    return response.choices[0]?.message?.content || 'Résumé non disponible';
  } catch (error: any) {
    console.error('Meeting notes summary error:', error);
    throw new Error(`Erreur lors du résumé: ${error.message}`);
  }
}

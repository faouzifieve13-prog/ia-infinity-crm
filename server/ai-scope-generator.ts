import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Veuillez configurer la clé API OpenAI.');
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
  clientCompany?: string,
  existingScope?: string
): Promise<ScopeGenerationResult> {
  const contractTypeLabels: Record<string, string> = {
    audit: "Contrat d'Audit IA",
    prestation: "Contrat de Prestation IA",
    formation: "Contrat de Formation IA",
    suivi: "Contrat de Suivi IA",
    sous_traitance: "Contrat de Sous-Traitance",
  };

  const hasActivities = activities && activities.length > 0;
  const activitiesText = hasActivities 
    ? activities.map(a => `[${a.type}] ${a.description}`).join('\n\n')
    : '';

  let prompt: string;
  
  if (hasActivities) {
    prompt = `Tu es un expert en rédaction de contrats commerciaux B2B pour une agence spécialisée en IA (Intelligence Artificielle).

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
  } else {
    const contextInfo = existingScope 
      ? `\n\nContexte existant: "${existingScope}"`
      : '';
    
    prompt = `Tu es un expert en rédaction de contrats commerciaux B2B pour une agence spécialisée en IA (Intelligence Artificielle).

Rédige un objet de contrat professionnel pour un ${contractTypeLabels[contractType] || 'contrat'} destiné au client "${clientCompany || clientName}".${contextInfo}

Type de contrat : ${contractTypeLabels[contractType]}

L'objet du contrat doit :
- Être professionnel et précis
- Décrire les prestations typiques pour ce type de contrat
- Être rédigé à la troisième personne
- Faire entre 3 et 6 phrases
- Être personnalisé pour le client mentionné

Réponds uniquement au format JSON suivant :
{
  "objectScope": "Description détaillée de l'objet du contrat...",
  "summary": "Résumé en une phrase du projet",
  "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
}`;
  }

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

export type NotesAIAction = 'structure' | 'summarize' | 'actions' | 'improve';

export interface NotesAIResult {
  content: string;
  action: NotesAIAction;
}

export async function enhanceNotes(
  notes: string,
  action: NotesAIAction,
  context?: { companyName?: string; contactName?: string; dealName?: string }
): Promise<NotesAIResult> {
  const contextInfo = context
    ? `\nContexte: Client "${context.companyName || 'Non spécifié'}", Contact: "${context.contactName || 'Non spécifié'}", Opportunité: "${context.dealName || 'Non spécifié'}"`
    : '';

  const prompts: Record<NotesAIAction, { system: string; user: string }> = {
    structure: {
      system: 'Tu es un assistant commercial expert en prise de notes. Tu structures et organises les notes de réunion de manière claire et professionnelle en français. Utilise du Markdown pour la mise en forme (titres ##, listes -, gras **).',
      user: `Structure et organise ces notes de réunion de manière claire et professionnelle.${contextInfo}\n\nNotes brutes:\n${notes}\n\nRéponds uniquement avec les notes structurées en Markdown.`,
    },
    summarize: {
      system: 'Tu es un assistant commercial. Tu résumes les notes de réunion de manière concise et percutante en français.',
      user: `Résume ces notes de réunion en un paragraphe concis (3-5 phrases) qui capture l'essentiel.${contextInfo}\n\nNotes:\n${notes}\n\nRéponds uniquement avec le résumé.`,
    },
    actions: {
      system: 'Tu es un assistant commercial expert en suivi client. Tu extrais les actions à faire et les prochaines étapes des notes de réunion.',
      user: `Extrais les actions à faire et prochaines étapes de ces notes. Formate en liste Markdown avec des cases à cocher.${contextInfo}\n\nNotes:\n${notes}\n\nRéponds avec une liste formatée:\n## Actions à faire\n- [ ] Action 1\n- [ ] Action 2\n\n## Prochaines étapes\n- Étape 1\n- Étape 2`,
    },
    improve: {
      system: 'Tu es un assistant commercial expert en rédaction. Tu améliores la rédaction des notes tout en conservant toutes les informations importantes. Utilise un style professionnel et clair.',
      user: `Améliore la rédaction de ces notes tout en conservant toutes les informations. Corrige les fautes, améliore le style et la clarté.${contextInfo}\n\nNotes originales:\n${notes}\n\nRéponds uniquement avec les notes améliorées.`,
    },
  };

  const prompt = prompts[action];
  if (!prompt) {
    throw new Error(`Action non supportée: ${action}`);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      max_completion_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Pas de réponse de l\'IA');
    }

    return { content, action };
  } catch (error: any) {
    console.error('Notes enhancement error:', error);
    throw new Error(`Erreur lors de l'amélioration des notes: ${error.message}`);
  }
}

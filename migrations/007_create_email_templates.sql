-- Migration: Create email_templates table with default templates
-- Purpose: Email templates by pipeline stage for quick follow-ups
-- Date: 2026-01-01

BEGIN;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR REFERENCES organizations(id),
  stage TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS email_templates_org_idx ON email_templates(org_id);
CREATE INDEX IF NOT EXISTS email_templates_stage_idx ON email_templates(org_id, stage);

-- Insert default templates (org_id NULL = global templates)
INSERT INTO email_templates (id, org_id, stage, subject, body) VALUES
  (gen_random_uuid(), NULL, 'prospect',
   'Prise de contact - {dealTitle}',
   'Bonjour {clientName},

Je me permets de vous contacter suite à notre échange concernant {dealTitle}.

Seriez-vous disponible pour un appel de 15 minutes cette semaine afin de discuter de vos besoins ?

Bien cordialement'),

  (gen_random_uuid(), NULL, 'meeting',
   'Suite à notre rendez-vous - {dealTitle}',
   'Bonjour {clientName},

Je vous remercie pour le temps que vous m''avez accordé lors de notre rendez-vous.

Suite à notre discussion, je vous propose de passer à l''étape suivante avec une proposition détaillée pour {dealTitle}.

Montant estimé : {value}€

N''hésitez pas à me faire part de vos questions.

Bien cordialement'),

  (gen_random_uuid(), NULL, 'proposal',
   'Proposition commerciale - {dealTitle}',
   'Bonjour {clientName},

Veuillez trouver ci-joint notre proposition commerciale pour {dealTitle}.

Montant : {value}€

Je reste à votre disposition pour tout complément d''information.

Bien cordialement'),

  (gen_random_uuid(), NULL, 'audit',
   'Rapport d''audit - {dealTitle}',
   'Bonjour {clientName},

Suite à notre audit concernant {dealTitle}, je vous transmets nos conclusions et recommandations.

Je vous propose un point téléphonique pour en discuter ensemble.

Bien cordialement'),

  (gen_random_uuid(), NULL, 'negotiation',
   'Finalisation - {dealTitle}',
   'Bonjour {clientName},

Nous avançons bien sur {dealTitle} et je souhaite finaliser les derniers détails avec vous.

Montant convenu : {value}€

Pouvons-nous planifier un dernier échange cette semaine ?

Bien cordialement'),

  (gen_random_uuid(), NULL, 'won',
   'Bienvenue ! Démarrage de {dealTitle}',
   'Bonjour {clientName},

C''est avec plaisir que nous vous accueillons parmi nos clients !

Nous allons démarrer {dealTitle} dans les meilleurs délais.

Montant : {value}€

Je reviendrai vers vous très rapidement avec le planning de démarrage.

Bien cordialement'),

  (gen_random_uuid(), NULL, 'lost',
   'Restons en contact - {dealTitle}',
   'Bonjour {clientName},

Je comprends que {dealTitle} ne corresponde pas à vos besoins actuels.

N''hésitez pas à me recontacter si votre situation évolue, je serai ravi de reprendre notre discussion.

Je vous souhaite une excellente continuation.

Bien cordialement');

COMMIT;

-- Supprimer les doublons existants (garder le plus récent par project_id + stage)
DELETE FROM delivery_milestones
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, stage) id
  FROM delivery_milestones
  ORDER BY project_id, stage, created_at DESC
);

-- Ajouter contrainte UNIQUE
ALTER TABLE delivery_milestones
ADD CONSTRAINT delivery_milestones_project_stage_unique UNIQUE (project_id, stage);

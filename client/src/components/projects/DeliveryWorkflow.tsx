import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Circle, 
  FileCheck, 
  Send, 
  ThumbsUp, 
  AlertCircle,
  FileSignature
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SignaturePad, SignatureDisplay } from '@/components/SignaturePad';
import type { Project } from '@/lib/types';

interface DeliveryStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface DeliveryWorkflowProps {
  project: Project;
  onUpdate?: () => void;
}

const defaultDeliverySteps: Omit<DeliveryStep, 'completed'>[] = [
  {
    id: 'development',
    title: 'Développement terminé',
    description: 'Toutes les fonctionnalités ont été développées selon le cahier des charges',
    required: true,
  },
  {
    id: 'testing',
    title: 'Tests réalisés',
    description: 'Les tests internes ont été effectués et validés',
    required: true,
  },
  {
    id: 'documentation',
    title: 'Documentation livrée',
    description: 'La documentation technique et utilisateur est complète',
    required: true,
  },
  {
    id: 'demo',
    title: 'Démonstration client',
    description: 'Une démonstration a été réalisée avec le client',
    required: true,
  },
  {
    id: 'training',
    title: 'Formation dispensée',
    description: 'L\'équipe client a été formée à l\'utilisation',
    required: false,
  },
  {
    id: 'deployment',
    title: 'Déploiement effectué',
    description: 'La solution est déployée en production',
    required: true,
  },
];

function parseDeliverySteps(stepsJson: string | null | undefined): Record<string, boolean> {
  if (!stepsJson) return {};
  try {
    return JSON.parse(stepsJson);
  } catch {
    return {};
  }
}

export function DeliveryWorkflow({ project, onUpdate }: DeliveryWorkflowProps) {
  const { toast } = useToast();
  
  const savedSteps = parseDeliverySteps(project.deliverySteps);
  
  const [steps, setSteps] = useState<DeliveryStep[]>(() => {
    return defaultDeliverySteps.map(step => ({
      ...step,
      completed: savedSteps[step.id] || false,
    }));
  });
  
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [validationNotes, setValidationNotes] = useState(project.clientValidationNotes || '');

  useEffect(() => {
    const savedSteps = parseDeliverySteps(project.deliverySteps);
    setSteps(prev => prev.map(step => ({
      ...step,
      completed: savedSteps[step.id] || false,
    })));
    setValidationNotes(project.clientValidationNotes || '');
  }, [project.deliverySteps, project.clientValidationNotes]);

  const completedSteps = steps.filter(s => s.completed).length;
  const requiredCompleted = steps.filter(s => s.required && s.completed).length;
  const requiredTotal = steps.filter(s => s.required).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const canValidate = requiredCompleted === requiredTotal;

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return apiRequest('PATCH', `/api/projects/${project.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      onUpdate?.();
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  const handleStepToggle = (stepId: string, checked: boolean) => {
    const newSteps = steps.map(step => 
      step.id === stepId ? { ...step, completed: checked } : step
    );
    setSteps(newSteps);
    
    const stepsState: Record<string, boolean> = {};
    newSteps.forEach(s => {
      stepsState[s.id] = s.completed;
    });
    
    const newCompletedCount = newSteps.filter(s => s.completed).length;
    const newProgress = Math.round((newCompletedCount / newSteps.length) * 100);
    
    updateProjectMutation.mutate({
      deliverySteps: JSON.stringify(stepsState),
      progress: newProgress,
    });
  };

  const handleRequestValidation = () => {
    setIsValidationOpen(true);
  };

  const handleSendValidation = () => {
    updateProjectMutation.mutate({
      clientValidationNotes: validationNotes,
    });
    
    toast({ 
      title: 'Demande de validation envoyée',
      description: 'Le client a été notifié pour valider la livraison.'
    });
    setIsValidationOpen(false);
  };

  const handleClientApproval = () => {
    setIsSignatureOpen(true);
  };

  const handleSignatureComplete = (signatureData: string) => {
    setIsSignatureOpen(false);
    
    updateProjectMutation.mutate({
      status: 'completed',
      progress: 100,
      clientApprovalSignature: signatureData,
      clientApprovalDate: new Date().toISOString(),
      clientApprovedBy: 'Client',
    });

    toast({ 
      title: 'Projet validé par le client',
      description: 'La livraison a été approuvée et signée.'
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Workflow de Livraison
              </CardTitle>
              <CardDescription>
                Suivez les étapes de livraison et obtenez la validation client
              </CardDescription>
            </div>
            <Badge variant={canValidate ? 'default' : 'secondary'}>
              {progress}% complété
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={progress} className="h-2" />
          
          <div className="space-y-3">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  step.completed ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={step.completed}
                  onCheckedChange={(checked) => handleStepToggle(step.id, checked as boolean)}
                  disabled={project.status === 'completed'}
                  data-testid={`checkbox-step-${step.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </p>
                    {step.required && (
                      <Badge variant="outline" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{requiredCompleted}/{requiredTotal}</span> étapes requises complétées
            </div>
            
            <div className="flex gap-2">
              {project.status !== 'completed' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleRequestValidation}
                    disabled={!canValidate || updateProjectMutation.isPending}
                    data-testid="button-request-validation"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Demander validation
                  </Button>
                  <Button 
                    onClick={handleClientApproval}
                    disabled={!canValidate || updateProjectMutation.isPending}
                    data-testid="button-client-approval"
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Validation client
                  </Button>
                </>
              )}
            </div>
          </div>

          {!canValidate && project.status !== 'completed' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Complétez toutes les étapes requises avant de demander la validation client.
              </p>
            </div>
          )}

          {project.clientApprovalSignature && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-emerald-500" />
                Validation client confirmée
              </h4>
              <SignatureDisplay
                signatureData={project.clientApprovalSignature}
                signerName={project.clientApprovedBy || 'Client'}
                signedAt={project.clientApprovalDate || undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isValidationOpen} onOpenChange={setIsValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander la validation client</DialogTitle>
            <DialogDescription>
              Un email sera envoyé au client pour valider la livraison du projet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes pour le client (optionnel)</label>
              <Textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Ajoutez des commentaires sur la livraison..."
                className="mt-2"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Récapitulatif</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>{completedSteps} étapes complétées sur {steps.length}</li>
                <li>Progression: {progress}%</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidationOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendValidation} 
              disabled={updateProjectMutation.isPending}
              data-testid="button-send-validation"
            >
              <Send className="mr-2 h-4 w-4" />
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validation client</DialogTitle>
            <DialogDescription>
              Le client doit signer pour confirmer l'acceptation de la livraison.
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            onSave={handleSignatureComplete}
            onCancel={() => setIsSignatureOpen(false)}
            title="Signature du client"
            description="En signant, le client confirme que la livraison est conforme aux attentes."
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

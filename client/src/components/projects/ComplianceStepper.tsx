import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  FileText,
  List,
  Upload,
  CheckSquare,
  AlertCircle,
  Clock,
  Loader2,
  Save,
  Send,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type {
  ComplianceStep,
  ComplianceStepStatus,
  ComplianceStepType,
  ChecklistItem,
  DynamicListItem,
  ProjectDeliverable
} from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';

interface ComplianceStepperProps {
  deliverable: ProjectDeliverable;
  projectId: string;
  isVendorView?: boolean;
  onProgressUpdate?: (progress: number) => void;
}

const STATUS_CONFIG: Record<ComplianceStepStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  locked: {
    label: 'Verrouillé',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: Lock
  },
  pending: {
    label: 'En attente',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    icon: Clock
  },
  draft: {
    label: 'Brouillon',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    icon: FileText
  },
  submitted: {
    label: 'Soumis',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    icon: Send
  },
  approved: {
    label: 'Approuvé',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    icon: Check
  },
  rejected: {
    label: 'Rejeté',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    icon: X
  },
  completed: {
    label: 'Terminé',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    icon: Check
  },
};

const STEP_TYPE_CONFIG: Record<ComplianceStepType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  form_text: { label: 'Texte', icon: FileText },
  form_textarea: { label: 'Zone de texte', icon: FileText },
  checklist: { label: 'Checklist', icon: CheckSquare },
  dynamic_list: { label: 'Liste dynamique', icon: List },
  file_upload: { label: 'Téléversement', icon: Upload },
  approval: { label: 'Approbation', icon: Check },
  correction_list: { label: 'Corrections', icon: AlertCircle },
};

export function ComplianceStepper({
  deliverable,
  projectId,
  isVendorView = false,
  onProgressUpdate
}: ComplianceStepperProps) {
  const queryClient = useQueryClient();
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const baseUrl = isVendorView
    ? `/api/vendor/projects/${projectId}/deliverables/${deliverable.id}/compliance-steps`
    : `/api/projects/${projectId}/deliverables/${deliverable.id}/compliance-steps`;

  const { data: steps = [], isLoading } = useQuery<ComplianceStep[]>({
    queryKey: ['compliance-steps', deliverable.id],
    queryFn: async () => {
      const res = await apiRequest('GET', baseUrl);
      return res.json();
    },
  });

  // Calculate progress from steps
  const completedSteps = steps.filter(s =>
    s.status === 'completed' || s.status === 'approved'
  ).length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  useEffect(() => {
    onProgressUpdate?.(progress);
  }, [progress, onProgressUpdate]);

  // Auto-expand first pending/draft step
  useEffect(() => {
    if (!expandedStepId && steps.length > 0) {
      const firstActionable = steps.find(s =>
        s.status === 'pending' || s.status === 'draft'
      );
      if (firstActionable) {
        setExpandedStepId(firstActionable.id);
      }
    }
  }, [steps, expandedStepId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Aucune étape de conformité configurée pour ce livrable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progression conformité</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Badge variant={progress === 100 ? "default" : "secondary"}>
          {completedSteps}/{totalSteps} étapes
        </Badge>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <ComplianceStepItem
            key={step.id}
            step={step}
            stepIndex={index}
            isExpanded={expandedStepId === step.id}
            onToggle={() => setExpandedStepId(
              expandedStepId === step.id ? null : step.id
            )}
            isVendorView={isVendorView}
            onUpdate={() => {
              queryClient.invalidateQueries({
                queryKey: ['compliance-steps', deliverable.id]
              });
            }}
          />
        ))}
      </div>

      {/* Upload button - unlocked at 100% */}
      {isVendorView && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 pt-4 border-t"
        >
          <Button
            disabled={progress < 100}
            className="w-full"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            {progress < 100
              ? `Téléversement débloqué à 100% (${progress}% actuellement)`
              : 'Téléverser le livrable final'
            }
          </Button>
        </motion.div>
      )}
    </div>
  );
}

interface ComplianceStepItemProps {
  step: ComplianceStep;
  stepIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  isVendorView: boolean;
  onUpdate: () => void;
}

function ComplianceStepItem({
  step,
  stepIndex,
  isExpanded,
  onToggle,
  isVendorView,
  onUpdate
}: ComplianceStepItemProps) {
  const statusConfig = STATUS_CONFIG[step.status];
  const stepTypeConfig = STEP_TYPE_CONFIG[step.stepType];
  const StatusIcon = statusConfig.icon;
  const isLocked = step.status === 'locked';
  const canEdit = isVendorView && (step.status === 'pending' || step.status === 'draft');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stepIndex * 0.05 }}
    >
      <Collapsible open={isExpanded && !isLocked} onOpenChange={onToggle}>
        <Card className={cn(
          "transition-all duration-200",
          isLocked && "opacity-60",
          isExpanded && !isLocked && "ring-2 ring-primary/20"
        )}>
          <CollapsibleTrigger asChild disabled={isLocked}>
            <CardHeader className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors py-3",
              isLocked && "cursor-not-allowed"
            )}>
              <div className="flex items-center gap-3">
                {/* Step number circle */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  step.status === 'completed' || step.status === 'approved'
                    ? "bg-emerald-500 text-white"
                    : step.status === 'rejected'
                    ? "bg-red-500 text-white"
                    : statusConfig.bgColor + " " + statusConfig.color
                )}>
                  {step.status === 'completed' || step.status === 'approved' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    stepIndex + 1
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium truncate">
                      {step.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {stepTypeConfig.label}
                    </Badge>
                  </div>
                  {step.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", statusConfig.bgColor, statusConfig.color)}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>

                {/* Expand icon */}
                {!isLocked && (
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              {/* Rejection feedback */}
              {step.status === 'rejected' && step.adminFeedback && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Corrections demandées
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {step.adminFeedback}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic form based on step type */}
              <StepFormContent
                step={step}
                canEdit={canEdit}
                onUpdate={onUpdate}
                isVendorView={isVendorView}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}

interface StepFormContentProps {
  step: ComplianceStep;
  canEdit: boolean;
  onUpdate: () => void;
  isVendorView: boolean;
}

function StepFormContent({ step, canEdit, onUpdate, isVendorView }: StepFormContentProps) {
  const [localFormData, setLocalFormData] = useState<Record<string, unknown>>(
    step.formData || {}
  );
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>(
    step.checklistItems || []
  );
  const [localDynamicList, setLocalDynamicList] = useState<DynamicListItem[]>(
    step.dynamicListData || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedFormData = useDebounce(localFormData, 1000);
  const debouncedChecklist = useDebounce(localChecklist, 1000);
  const debouncedDynamicList = useDebounce(localDynamicList, 1000);

  const saveDraftUrl = isVendorView
    ? `/api/vendor/compliance-steps/${step.id}/save-draft`
    : `/api/compliance-steps/${step.id}`;

  const submitUrl = isVendorView
    ? `/api/vendor/compliance-steps/${step.id}/submit`
    : `/api/compliance-steps/${step.id}/submit`;

  // Auto-save draft
  useEffect(() => {
    if (!canEdit) return;

    const hasChanges =
      JSON.stringify(debouncedFormData) !== JSON.stringify(step.formData) ||
      JSON.stringify(debouncedChecklist) !== JSON.stringify(step.checklistItems) ||
      JSON.stringify(debouncedDynamicList) !== JSON.stringify(step.dynamicListData);

    if (hasChanges) {
      saveDraft();
    }
  }, [debouncedFormData, debouncedChecklist, debouncedDynamicList]);

  const saveDraft = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      await apiRequest('POST', saveDraftUrl, {
        formData: localFormData,
        checklistItems: localChecklist,
        dynamicListData: localDynamicList,
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', submitUrl, {
        formData: localFormData,
        checklistItems: localChecklist,
        dynamicListData: localDynamicList,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to submit step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form based on step type
  const renderFormContent = () => {
    switch (step.stepType) {
      case 'form_text':
        return (
          <FormTextField
            step={step}
            value={localFormData.value as string || ''}
            onChange={(value) => setLocalFormData({ ...localFormData, value })}
            canEdit={canEdit}
          />
        );

      case 'form_textarea':
        return (
          <FormTextareaField
            step={step}
            value={localFormData.value as string || ''}
            onChange={(value) => setLocalFormData({ ...localFormData, value })}
            canEdit={canEdit}
          />
        );

      case 'checklist':
        return (
          <ChecklistField
            items={localChecklist}
            onChange={setLocalChecklist}
            canEdit={canEdit}
          />
        );

      case 'dynamic_list':
        return (
          <DynamicListField
            items={localDynamicList}
            onChange={setLocalDynamicList}
            canEdit={canEdit}
            placeholder={step.formSchema?.placeholder as string}
          />
        );

      case 'file_upload':
        return (
          <FileUploadField
            fileUrl={step.fileUrl}
            canEdit={canEdit}
          />
        );

      case 'approval':
        return (
          <ApprovalField
            step={step}
            isVendorView={isVendorView}
            onUpdate={onUpdate}
          />
        );

      case 'correction_list':
        return (
          <CorrectionListField
            items={localDynamicList}
            onChange={setLocalDynamicList}
            canEdit={canEdit}
          />
        );

      default:
        return <p className="text-muted-foreground">Type d'étape non supporté</p>;
    }
  };

  return (
    <div className="space-y-4">
      {renderFormContent()}

      {/* Action buttons for vendor */}
      {canEdit && step.stepType !== 'approval' && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Sauvegarde...</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                <span>Sauvegarde automatique</span>
              </>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Soumettre
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual field components
function FormTextField({
  step,
  value,
  onChange,
  canEdit
}: {
  step: ComplianceStep;
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
}) {
  const label = step.formSchema?.label as string || step.name;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!canEdit}
        placeholder={step.formSchema?.placeholder as string || 'Entrez votre réponse...'}
      />
    </div>
  );
}

function FormTextareaField({
  step,
  value,
  onChange,
  canEdit
}: {
  step: ComplianceStep;
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
}) {
  const label = step.formSchema?.label as string || step.name;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!canEdit}
        placeholder={step.formSchema?.placeholder as string || 'Entrez votre réponse...'}
        rows={4}
      />
    </div>
  );
}

function ChecklistField({
  items,
  onChange,
  canEdit
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  canEdit: boolean;
}) {
  const toggleItem = (id: string) => {
    if (!canEdit) return;
    onChange(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {checkedCount}/{items.length} complété
        </span>
        <Progress value={(checkedCount / items.length) * 100} className="w-24 h-2" />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <motion.div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              item.checked && "bg-emerald-50 dark:bg-emerald-950"
            )}
            layout
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
              disabled={!canEdit}
            />
            <span className={cn(
              "text-sm transition-all",
              item.checked && "line-through text-muted-foreground"
            )}>
              {item.label}
            </span>
            {item.checked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <Check className="h-4 w-4 text-emerald-500" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DynamicListField({
  items,
  onChange,
  canEdit,
  placeholder = 'Nouvel élément...'
}: {
  items: DynamicListItem[];
  onChange: (items: DynamicListItem[]) => void;
  canEdit: boolean;
  placeholder?: string;
}) {
  const [newValue, setNewValue] = useState('');

  const addItem = () => {
    if (!newValue.trim() || !canEdit) return;
    onChange([
      ...items,
      { id: `item-${Date.now()}`, value: newValue.trim() }
    ]);
    setNewValue('');
  };

  const removeItem = (id: string) => {
    if (!canEdit) return;
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, value: string) => {
    if (!canEdit) return;
    onChange(items.map(item =>
      item.id === id ? { ...item, value } : item
    ));
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <Input
              value={item.value}
              onChange={(e) => updateItem(item.id, e.target.value)}
              disabled={!canEdit}
              className="flex-1"
            />
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {canEdit && (
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1"
          />
          <Button onClick={addItem} variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FileUploadField({
  fileUrl,
  canEdit
}: {
  fileUrl?: string | null;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      {fileUrl ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex-1 truncate"
          >
            {fileUrl}
          </a>
        </div>
      ) : (
        <div className="text-center p-6 border-2 border-dashed rounded-lg">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {canEdit ? 'Glissez un fichier ou cliquez pour téléverser' : 'Aucun fichier téléversé'}
          </p>
          {canEdit && (
            <Button variant="outline" className="mt-3">
              Choisir un fichier
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalField({
  step,
  isVendorView,
  onUpdate
}: {
  step: ComplianceStep;
  isVendorView: boolean;
  onUpdate: () => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await apiRequest('POST', `/api/compliance-steps/${step.id}/approve`);
      onUpdate();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) return;
    setIsRejecting(true);
    try {
      await apiRequest('POST', `/api/compliance-steps/${step.id}/reject`, { feedback });
      onUpdate();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  if (isVendorView) {
    return (
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          En attente de validation par l'administrateur
        </p>
      </div>
    );
  }

  if (step.status === 'approved' || step.status === 'completed') {
    return (
      <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
        <Check className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Approuvé {step.reviewedAt && `le ${new Date(step.reviewedAt).toLocaleDateString('fr-FR')}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={isApproving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Approuver
        </Button>
        <Button
          variant="destructive"
          onClick={handleReject}
          disabled={isRejecting || !feedback.trim()}
          className="flex-1"
        >
          {isRejecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Rejeter
        </Button>
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Motif du rejet (obligatoire pour rejeter)..."
        rows={2}
      />
    </div>
  );
}

function CorrectionListField({
  items,
  onChange,
  canEdit
}: {
  items: DynamicListItem[];
  onChange: (items: DynamicListItem[]) => void;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Liste des corrections à apporter:
      </p>
      <DynamicListField
        items={items}
        onChange={onChange}
        canEdit={canEdit}
        placeholder="Ajouter une correction..."
      />
    </div>
  );
}

export default ComplianceStepper;

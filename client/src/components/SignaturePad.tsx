import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Check, Pen } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  signerName?: string;
}

export function SignaturePad({ 
  onSave, 
  onCancel,
  title = "Signature électronique",
  description = "Signez dans le cadre ci-dessous",
  signerName
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pen className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {signerName && (
          <p className="text-sm text-muted-foreground">
            Signataire : <span className="font-medium text-foreground">{signerName}</span>
          </p>
        )}
        
        <div className="border rounded-lg bg-white dark:bg-gray-900 relative overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'w-full h-48 cursor-crosshair',
              style: { 
                width: '100%', 
                height: '192px',
                touchAction: 'none'
              }
            }}
            onEnd={handleEnd}
            backgroundColor="transparent"
            penColor="#1e293b"
          />
          <div className="absolute bottom-2 left-2 right-2 border-b border-dashed border-gray-300 dark:border-gray-600" />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Signez avec votre souris ou votre doigt sur l'écran tactile
        </p>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel-signature">
              Annuler
            </Button>
          )}
          <Button variant="outline" onClick={handleClear} data-testid="button-clear-signature">
            <RotateCcw className="mr-2 h-4 w-4" />
            Effacer
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isEmpty}
            data-testid="button-save-signature"
          >
            <Check className="mr-2 h-4 w-4" />
            Valider la signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SignatureDisplayProps {
  signatureData: string;
  signerName?: string;
  signedAt?: string;
  className?: string;
}

export function SignatureDisplay({ 
  signatureData, 
  signerName, 
  signedAt,
  className = ""
}: SignatureDisplayProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
        <img 
          src={signatureData} 
          alt="Signature" 
          className="max-h-24 mx-auto"
        />
      </div>
      <div className="text-center text-sm text-muted-foreground">
        {signerName && <p>Signé par : <span className="font-medium">{signerName}</span></p>}
        {signedAt && <p>Le : {new Date(signedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>}
      </div>
    </div>
  );
}

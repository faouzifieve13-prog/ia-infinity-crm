import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Clock, Shield, Building, User } from "lucide-react";

type InvitationData = {
  id: string;
  email: string;
  role: string;
  space: string;
  expiresAt: string;
};

type ValidationResponse = {
  valid: boolean;
  invitation?: InvitationData;
  error?: string;
  status?: string;
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  sales: "Commercial",
  delivery: "Delivery Manager",
  finance: "Finance",
  client_admin: "Admin Client",
  client_member: "Membre Client",
  vendor: "Prestataire",
};

const spaceLabels: Record<string, string> = {
  internal: "Espace Interne",
  client: "Portail Client",
  vendor: "Portail Prestataire",
};

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [name, setName] = useState("");
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);

    if (tokenParam) {
      validateToken(tokenParam);
    } else {
      setValidationState("invalid");
      setErrorMessage("Lien d'invitation invalide. Aucun token fourni.");
    }
  }, []);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });
      
      const data: ValidationResponse = await response.json();
      
      if (data.valid && data.invitation) {
        setValidationState("valid");
        setInvitation(data.invitation);
      } else {
        setValidationState("invalid");
        setErrorMessage(data.error || "Invitation invalide");
      }
    } catch (error) {
      setValidationState("error");
      setErrorMessage("Erreur lors de la validation de l'invitation");
    }
  };

  const acceptMutation = useMutation({
    mutationFn: async (data: { token: string; name: string }) => {
      const response = await apiRequest("POST", "/api/invitations/accept", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAcceptSuccess(true);
      setTimeout(() => {
        const space = invitation?.space || "internal";
        if (space === "client") {
          setLocation("/");
        } else if (space === "vendor") {
          setLocation("/missions");
        } else {
          setLocation("/");
        }
      }, 2000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Erreur lors de l'acceptation de l'invitation");
    },
  });

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;
    acceptMutation.mutate({ token, name: name.trim() });
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  };

  if (validationState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validation de l'invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationState === "invalid" || validationState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Invalide</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Ce lien d'invitation a peut-être expiré ou a déjà été utilisé.
              Veuillez contacter votre administrateur pour obtenir un nouveau lien.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-home">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Bienvenue !</CardTitle>
            <CardDescription>
              Votre compte a été créé avec succès. Vous allez être redirigé...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Rejoindre IA Infinity</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium" data-testid="text-invitation-email">{invitation.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Espace</p>
                  <Badge variant="secondary" data-testid="badge-invitation-space">
                    {spaceLabels[invitation.space] || invitation.space}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Rôle</p>
                  <Badge variant="outline" data-testid="badge-invitation-role">
                    {roleLabels[invitation.role] || invitation.role}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expire dans</p>
                  <p className="font-medium text-amber-600" data-testid="text-invitation-expiry">
                    {formatExpiryTime(invitation.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Votre nom complet</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                data-testid="input-accept-name"
              />
            </div>

            {acceptMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={acceptMutation.isPending || !name.trim()}
              data-testid="button-accept-invitation"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "Accepter l'invitation"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

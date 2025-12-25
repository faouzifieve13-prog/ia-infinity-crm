import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Clock, Shield, Building, User, LogIn } from "lucide-react";

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

type LinkResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  contact?: { id: string; name: string; email: string };
};

export default function VendorAcceptInvite() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [linkSuccess, setLinkSuccess] = useState(false);
  const linkAttempted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let tokenParam = params.get("token");
    
    // Check if returning from login with stored token
    if (!tokenParam) {
      const storedUrl = sessionStorage.getItem("vendor_invite_return");
      if (storedUrl) {
        sessionStorage.removeItem("vendor_invite_return");
        const storedParams = new URLSearchParams(new URL(storedUrl).search);
        tokenParam = storedParams.get("token");
        // Update URL with token for consistency
        if (tokenParam) {
          window.history.replaceState({}, "", `/auth/vendor-invite?token=${tokenParam}`);
        }
      }
    }
    
    setToken(tokenParam);

    if (tokenParam) {
      validateToken(tokenParam);
    } else {
      setValidationState("invalid");
      setErrorMessage("Lien d'invitation invalide. Aucun token fourni.");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token && validationState === "valid" && !linkSuccess && !linkAttempted.current) {
      linkAttempted.current = true;
      linkAccount();
    }
  }, [isAuthenticated, token, validationState]);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });
      
      const data: ValidationResponse = await response.json();
      
      if (data.valid) {
        if (!data.invitation) {
          setValidationState("invalid");
          setErrorMessage("Données d'invitation manquantes");
          return;
        }
        if (data.invitation.space !== "vendor") {
          setLocation(`/auth/accept-invite?token=${tokenValue}`);
          return;
        }
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

  const linkMutation = useMutation({
    mutationFn: async (tokenValue: string) => {
      const response = await apiRequest("POST", "/api/vendor/link", { token: tokenValue });
      const data: LinkResponse = await response.json();
      
      // Check for error in response body (even with 200 status)
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Handle "Already linked" case as success
      if (data.message === "Already linked" || data.success) {
        return data;
      }
      
      // If there's a message but no success, display it
      if (data.message) {
        throw new Error(data.message);
      }
      
      throw new Error("La liaison du compte a échoué");
    },
    onSuccess: (data) => {
      setLinkSuccess(true);
      setTimeout(() => {
        setLocation("/vendor/missions");
      }, 2000);
    },
    onError: (error: Error) => {
      linkAttempted.current = false; // Allow retry
      setErrorMessage(error.message || "Erreur lors de la liaison du compte");
    },
  });

  const linkAccount = () => {
    if (token && !linkMutation.isPending && !linkSuccess) {
      linkMutation.mutate(token);
    }
  };

  const handleLogin = () => {
    const currentUrl = window.location.href;
    sessionStorage.setItem("vendor_invite_return", currentUrl);
    window.location.href = "/api/login";
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

  if (validationState === "loading" || authLoading) {
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

  if (linkSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Bienvenue !</CardTitle>
            <CardDescription>
              Votre compte sous-traitant a été lié avec succès. Vous allez être redirigé vers votre espace...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (linkMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Liaison de votre compte en cours...</p>
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
          <CardTitle>Portail Sous-Traitant</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre IA Infinity en tant que sous-traitant
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
                    Portail Sous-Traitant
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Rôle</p>
                  <Badge variant="outline" data-testid="badge-invitation-role">
                    Sous-Traitant
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

          {linkMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Pour accéder à votre espace sous-traitant, veuillez vous connecter avec votre compte.
              </p>
              <Button 
                onClick={handleLogin}
                className="w-full" 
                data-testid="button-login-vendor"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Se connecter
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Vous êtes connecté en tant que <strong>{user?.email}</strong>.
              </p>
              <Button 
                onClick={linkAccount}
                className="w-full" 
                disabled={linkMutation.isPending}
                data-testid="button-link-vendor-account"
              >
                {linkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Liaison en cours...
                  </>
                ) : (
                  "Lier mon compte et accéder"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

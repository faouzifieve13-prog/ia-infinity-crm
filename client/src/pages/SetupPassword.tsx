import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, User, ArrowRight, Eye, EyeOff, Check, X, AlertCircle, Mail } from "lucide-react";

export default function SetupPassword() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");
    if (!t) {
      toast({
        title: "Lien invalide",
        description: "Le lien d'invitation est invalide ou expiré",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    // Validate token and get email
    fetch("/api/invitations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.invitation?.email) {
          setToken(t);
          setEmail(data.invitation.email);
          if (data.invitation.name) setName(data.invitation.name);
        } else {
          toast({
            title: "Lien invalide",
            description: data.error || "Le lien d'invitation est invalide ou expiré",
            variant: "destructive",
          });
          setLocation("/login");
        }
      })
      .catch(() => {
        toast({
          title: "Erreur",
          description: "Impossible de valider l'invitation",
          variant: "destructive",
        });
        setLocation("/login");
      })
      .finally(() => setIsValidating(false));
  }, []);

  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    matches: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const setupMutation = useMutation({
    mutationFn: async (data: { token: string; password: string; name?: string }) => {
      const response = await apiRequest("POST", "/api/auth/accept-invitation", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Compte créé",
        description: "Votre mot de passe a été configuré. Vous êtes maintenant connecté.",
      });
      
      const role = data.role;
      if (role === "client_admin" || role === "client_member") {
        setLocation("/client");
      } else if (role === "vendor") {
        setLocation("/vendor");
      } else {
        setLocation("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de configurer le mot de passe",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (!isPasswordValid) {
      toast({
        title: "Mot de passe invalide",
        description: "Veuillez respecter tous les critères de sécurité",
        variant: "destructive",
      });
      return;
    }
    
    setupMutation.mutate({ token, password, name: name.trim() || undefined });
  };

  if (isValidating || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Validation de l'invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-violet-200 dark:border-violet-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Bienvenue sur IA Infinity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configurez votre mot de passe pour accéder à votre espace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (identifiant)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="pl-10 bg-muted cursor-not-allowed"
                  data-testid="input-email"
                />
              </div>
              <p className="text-xs text-muted-foreground">Cet email sera votre identifiant de connexion</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom (optionnel)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  data-testid="input-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  data-testid="input-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  data-testid="input-confirm-password"
                  required
                />
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
              <p className="font-medium text-muted-foreground mb-2">Critères du mot de passe :</p>
              <PasswordCheck label="Au moins 8 caractères" checked={passwordChecks.minLength} />
              <PasswordCheck label="Une majuscule" checked={passwordChecks.hasUppercase} />
              <PasswordCheck label="Une minuscule" checked={passwordChecks.hasLowercase} />
              <PasswordCheck label="Un chiffre" checked={passwordChecks.hasNumber} />
              <PasswordCheck label="Les mots de passe correspondent" checked={passwordChecks.matches} />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              disabled={!isPasswordValid || setupMutation.isPending}
              data-testid="button-setup-password"
            >
              {setupMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Configuration...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Créer mon compte
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

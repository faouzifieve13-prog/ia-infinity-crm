import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Mail, ArrowRight, Eye, EyeOff, User } from "lucide-react";
import logoImg from "@assets/logo_iA_Infinity_1766693283199.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInitMode, setIsInitMode] = useState(false);

  const { data: needsInitData, isLoading: checkingInit } = useQuery<{ needsInit: boolean }>({
    queryKey: ["/api/auth/needs-init"],
    queryFn: async () => {
      const res = await fetch("/api/auth/needs-init");
      return res.json();
    },
  });

  useEffect(() => {
    if (needsInitData?.needsInit) {
      setIsInitMode(true);
    }
  }, [needsInitData]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connexion réussie",
        description: `Bienvenue, ${data.user?.name || data.user?.email || ""}!`,
      });
      
      // Force page reload to ensure session cookie is properly set
      const role = data.role;
      if (role === "client_admin" || role === "client_member") {
        window.location.href = "/client";
      } else if (role === "vendor") {
        window.location.href = "/vendor";
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    },
  });

  const initAdminMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const response = await apiRequest("POST", "/api/auth/init-admin", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Administrateur créé",
        description: `Bienvenue, ${data.user?.name || data.user?.email || ""}!`,
      });
      // Force page reload to ensure session cookie is properly set
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'administrateur",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    
    if (isInitMode) {
      initAdminMutation.mutate({ email, password, name: name.trim() || undefined });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  if (checkingInit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-violet-200 dark:border-violet-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <img src={logoImg} alt="IA Infinity" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            IA Infinity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isInitMode 
              ? "Créez votre compte administrateur pour démarrer" 
              : "Connectez-vous à votre espace"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isInitMode && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  data-testid="input-email"
                  required
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
              {isInitMode && (
                <p className="text-xs text-muted-foreground">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              disabled={loginMutation.isPending || initAdminMutation.isPending}
              data-testid="button-login"
            >
              {(loginMutation.isPending || initAdminMutation.isPending) ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isInitMode ? "Création..." : "Connexion..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isInitMode ? "Créer le compte admin" : "Se connecter"}
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

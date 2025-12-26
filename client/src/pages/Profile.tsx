import { useState, useRef } from 'react';
import { Save, User, Mail, Calendar, Camera, Loader2, Shield, Briefcase, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSpace } from '@/hooks/use-space';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User as UserType } from '@/lib/types';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  sales: 'Commercial',
  delivery: 'Livraison',
  finance: 'Finance',
  client_admin: 'Admin Client',
  client_member: 'Membre Client',
  vendor: 'Sous-traitant',
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary/20 text-primary border-primary/30',
  sales: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivery: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  finance: 'bg-green-500/20 text-green-400 border-green-500/30',
  client_admin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  client_member: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  vendor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function Profile() {
  const { currentUser, currentSpace } = useSpace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<UserType>({
    queryKey: ['/api/profile'],
  });

  const [name, setName] = useState<string | null>(null);
  
  // Initialize name when profile loads
  if (profile && name === null) {
    setName(profile.name);
  }
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; avatar?: string | null }) => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Profil mis a jour',
        description: 'Vos informations ont ete enregistrees avec succes.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour le profil.',
        variant: 'destructive',
      });
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Fichier invalide',
        description: 'Veuillez selectionner une image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 2 Mo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);

      // Update avatar
      try {
        await updateProfileMutation.mutateAsync({ avatar: base64 });
      } catch (error) {
        setAvatarPreview(null);
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const trimmedName = (name || '').trim();
    if (trimmedName && trimmedName !== profile?.name) {
      updateProfileMutation.mutate({ name: trimmedName });
    } else {
      toast({
        title: 'Aucun changement',
        description: 'Le nom est identique ou vide.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = profile || currentUser;
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const displayName = name ?? user.name;
  const displayAvatar = avatarPreview || user.avatar;
  const roleLabel = roleLabels[user.role || 'admin'] || user.role;
  const roleColor = roleColors[user.role || 'admin'] || roleColors.admin;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Mon Profil</h1>
        <p className="text-muted-foreground">Gerez vos informations personnelles</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  {displayAvatar && <AvatarImage src={displayAvatar} alt={displayName} />}
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className={`mt-3 ${roleColor}`}>
                <Shield className="h-3 w-3 mr-1" />
                {roleLabel}
              </Badge>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Membre depuis {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'N/A'}</span>
              </div>
              {currentSpace === 'internal' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>Espace Admin</span>
                </div>
              )}
              {currentSpace === 'client' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Portail Client</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Modifiez vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={name ?? user.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                data-testid="input-profile-name"
              />
              <p className="text-xs text-muted-foreground">
                Ce nom sera affiche dans l'application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
                data-testid="input-profile-email"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas etre modifie
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={roleColor}>
                  {roleLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Defini par l'administrateur
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer les modifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

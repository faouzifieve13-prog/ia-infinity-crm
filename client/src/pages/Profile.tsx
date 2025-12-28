import { useState, useRef, useEffect } from 'react';
import {
  User, Mail, Calendar, Camera, Loader2, Shield, Briefcase, Building2,
  Trash2, Upload, Check, X, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSpace } from '@/hooks/use-space';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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

const spaceLabels: Record<string, { label: string; icon: typeof Shield }> = {
  internal: { label: 'Espace Administration', icon: Shield },
  client: { label: 'Portail Client', icon: Building2 },
  vendor: { label: 'Espace Sous-traitant', icon: Briefcase },
};

export default function Profile() {
  const { currentUser, currentSpace, setCurrentUser } = useSpace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data
  const { data: profile, isLoading, refetch } = useQuery<UserType>({
    queryKey: ['/api/profile'],
  });

  // Form state
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDeleteAvatarDialog, setShowDeleteAvatarDialog] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; avatar?: string | null }) => {
      const res = await apiRequest('PATCH', '/api/profile', data);
      return res.json();
    },
    onSuccess: (data) => {
      console.log('Profile update success, data:', data);
      // Force refetch to update profile data
      refetch();
      // Update currentUser directly for immediate UI update in header
      if (data) {
        const updatedUser = {
          id: data.id || currentUser?.id || '',
          name: data.name || currentUser?.name || '',
          email: data.email || currentUser?.email || '',
          avatar: data.avatar,
          role: data.role || currentUser?.role,
          vendorContactId: currentUser?.vendorContactId,
          accountId: currentUser?.accountId,
        };
        console.log('Setting currentUser with avatar:', updatedUser.avatar ? 'present' : 'null');
        setCurrentUser(updatedUser);
      }
      // Don't invalidate session immediately - it could overwrite the setCurrentUser
      // Session will sync on next page refresh
      toast({
        title: 'Profil mis a jour',
        description: 'Vos informations ont ete enregistrees avec succes.',
      });
      setIsEditing(false);
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
    console.log('Avatar click, ref:', fileInputRef.current);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Fichier invalide',
        description: 'Veuillez selectionner une image (JPG, PNG, GIF).',
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
      console.log('Avatar base64 length:', base64?.length);
      setAvatarPreview(base64);

      try {
        const result = await updateProfileMutation.mutateAsync({ avatar: base64 });
        console.log('Upload result:', result);
      } catch (error) {
        console.error('Upload error:', error);
        setAvatarPreview(null);
        toast({
          title: 'Erreur',
          description: 'Impossible de sauvegarder la photo.',
          variant: 'destructive',
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.onerror = () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de lire le fichier.',
        variant: 'destructive',
      });
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateProfileMutation.mutateAsync({ avatar: null });
      setAvatarPreview(null);
      setShowDeleteAvatarDialog(false);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveName = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: 'Nom requis',
        description: 'Le nom ne peut pas etre vide.',
        variant: 'destructive',
      });
      return;
    }
    if (trimmedName !== profile?.name) {
      updateProfileMutation.mutate({ name: trimmedName });
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile?.name || '');
    setIsEditing(false);
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
    .toUpperCase()
    .slice(0, 2);

  const displayAvatar = avatarPreview || user.avatar;
  const roleLabel = roleLabels[user.role || 'admin'] || user.role;
  const roleColor = roleColors[user.role || 'admin'] || roleColors.admin;
  const spaceInfo = spaceLabels[currentSpace] || spaceLabels.internal;
  const SpaceIcon = spaceInfo.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Mon Profil</h1>
          <p className="text-muted-foreground">Gerez vos informations personnelles et preferences</p>
        </div>
        <Badge variant="outline" className="h-8 px-3">
          <SpaceIcon className="h-4 w-4 mr-2" />
          {spaceInfo.label}
        </Badge>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16">
            {/* Avatar Section */}
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                {displayAvatar && <AvatarImage src={displayAvatar} alt={user.name} />}
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </Button>
                  {displayAvatar && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full bg-white/20 hover:bg-red-500/80 text-white"
                      onClick={() => setShowDeleteAvatarDialog(true)}
                      disabled={isUploadingAvatar}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left sm:pb-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 text-xl font-bold w-64"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <Badge variant="outline" className={roleColor}>
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabel}
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  Membre depuis {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'N/A'}
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAvatarClick} disabled={isUploadingAvatar}>
                <Upload className="h-4 w-4 mr-2" />
                Changer la photo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="account">
            <Shield className="h-4 w-4 mr-2" />
            Compte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Vos informations de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nom complet</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Adresse email</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Role</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className={roleColor}>
                      {roleLabel}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Espace actuel</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <SpaceIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{spaceInfo.label}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photo de profil</CardTitle>
              <CardDescription>Personnalisez votre avatar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2">
                  {displayAvatar && <AvatarImage src={displayAvatar} alt={user.name} />}
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAvatarClick} disabled={isUploadingAvatar}>
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Telecharger une image
                    </Button>
                    {displayAvatar && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setShowDeleteAvatarDialog(true)}
                        disabled={isUploadingAvatar}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Taille max 2 Mo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations du compte</CardTitle>
              <CardDescription>Details de votre compte utilisateur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">ID Utilisateur</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <code className="text-xs font-mono">{user.id}</code>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Date de creation</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Type de compte</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className={roleColor}>
                      {roleLabel}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Statut</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium text-green-600">Actif</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-amber-600 dark:text-amber-400">Zone sensible</CardTitle>
              <CardDescription>Actions qui affectent votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                <div>
                  <h4 className="font-medium">Changer le mot de passe</h4>
                  <p className="text-sm text-muted-foreground">Modifiez votre mot de passe de connexion</p>
                </div>
                <Button variant="outline" disabled>
                  Bientot disponible
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-destructive/30">
                <div>
                  <h4 className="font-medium text-destructive">Supprimer le compte</h4>
                  <p className="text-sm text-muted-foreground">Cette action est irreversible</p>
                </div>
                <Button variant="destructive" disabled>
                  Bientot disponible
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Avatar Dialog */}
      <AlertDialog open={showDeleteAvatarDialog} onOpenChange={setShowDeleteAvatarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la photo de profil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre photo de profil sera remplacee par vos initiales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAvatar}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

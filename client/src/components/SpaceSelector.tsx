import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Wrench, ChevronRight, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface AvailableSpace {
  membershipId: string;
  role: string;
  space: string;
  accountId: string | null;
  vendorContactId: string | null;
}

interface SpaceSelectorProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  availableSpaces: AvailableSpace[];
  onSpaceSelected: (data: any) => void;
}

export function SpaceSelector({ user, availableSpaces, onSpaceSelected }: SpaceSelectorProps) {
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);

  const selectSpaceMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const response = await fetch('/api/auth/select-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to select space');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onSpaceSelected(data);
    },
  });

  const handleSelectSpace = (membershipId: string) => {
    setSelectedSpace(membershipId);
    selectSpaceMutation.mutate(membershipId);
  };

  const getSpaceIcon = (space: string) => {
    switch (space) {
      case 'client':
        return Building2;
      case 'vendor':
        return Wrench;
      default:
        return User;
    }
  };

  const getSpaceTitle = (space: string, role: string) => {
    if (space === 'client') {
      return role === 'client_admin' ? 'Espace Client - Administrateur' : 'Espace Client - Membre';
    }
    if (space === 'vendor') {
      return 'Espace Sous-traitant';
    }
    return 'Espace Interne';
  };

  const getSpaceDescription = (space: string) => {
    if (space === 'client') {
      return 'Accédez à votre dossier client, projets et factures';
    }
    if (space === 'vendor') {
      return 'Gérez vos missions, projets assignés et factures';
    }
    return 'Accès complet à la plateforme';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Bienvenue, {user.name}</h1>
          <p className="text-muted-foreground">
            Vous avez accès à plusieurs espaces. Veuillez choisir celui que vous souhaitez utiliser.
          </p>
        </div>

        <div className="grid gap-4">
          {availableSpaces.map((space) => {
            const Icon = getSpaceIcon(space.space);
            const isSelected = selectedSpace === space.membershipId;
            const isLoading = selectSpaceMutation.isPending && isSelected;

            return (
              <Card
                key={space.membershipId}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-violet-600' : ''
                }`}
                onClick={() => !isLoading && handleSelectSpace(space.membershipId)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        space.space === 'client'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-violet-100 dark:bg-violet-900/30'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          space.space === 'client'
                            ? 'text-blue-600'
                            : 'text-violet-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {getSpaceTitle(space.space, space.role)}
                        </CardTitle>
                        <CardDescription>
                          {getSpaceDescription(space.space)}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        "Connexion..."
                      ) : (
                        <>
                          Accéder
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Vous pourrez changer d'espace à tout moment depuis le menu utilisateur
        </p>
      </div>
    </div>
  );
}

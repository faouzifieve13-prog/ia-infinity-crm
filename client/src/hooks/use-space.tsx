import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Space, UserRole, User } from '@/lib/types';

interface SpaceContextType {
  currentSpace: Space;
  setSpace: (space: Space) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  canAccessSpace: (space: Space) => boolean;
  vendorContactId: string | null;
  isLoadingUser: boolean;
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

const spaceAccessByRole: Record<UserRole, Space[]> = {
  admin: ['internal', 'client', 'vendor'],
  sales: ['internal'],
  delivery: ['internal'],
  finance: ['internal'],
  client_admin: ['client'],
  client_member: ['client'],
  vendor: ['vendor'],
};

interface AuthSession {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
  role?: UserRole;
  space?: Space;
  accountId?: string | null;
  vendorContactId?: string | null;
}

interface SpaceProviderProps {
  children: React.ReactNode;
  defaultSpace?: Space;
}

export function SpaceProvider({ children, defaultSpace = 'internal' }: SpaceProviderProps) {
  const [currentSpace, setCurrentSpace] = useState<Space>(defaultSpace);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch the authenticated user session
  const { data: session, isLoading: isLoadingUser } = useQuery<AuthSession>({
    queryKey: ['/api/auth/session'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync user from session
  useEffect(() => {
    if (session?.authenticated && session.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name || 'Utilisateur',
        email: session.user.email,
        avatar: session.user.avatar,
        role: session.role,
        vendorContactId: session.vendorContactId,
        accountId: session.accountId,
      });
      // Set the space based on the user's role if not already set
      if (session.space) {
        setCurrentSpace(session.space);
      }
    }
  }, [session]);

  const canAccessSpace = (space: Space): boolean => {
    if (!currentUser || !currentUser.role) return false;
    return spaceAccessByRole[currentUser.role].includes(space);
  };

  const setSpace = (space: Space) => {
    if (canAccessSpace(space)) {
      setCurrentSpace(space);
    }
  };

  const vendorContactId = currentUser?.vendorContactId || null;

  return (
    <SpaceContext.Provider value={{ currentSpace, setSpace, currentUser, setCurrentUser, canAccessSpace, vendorContactId, isLoadingUser }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  const context = useContext(SpaceContext);
  if (!context) throw new Error('useSpace must be used within SpaceProvider');
  return context;
}

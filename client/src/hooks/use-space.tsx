import { createContext, useContext, useState } from 'react';
import type { Space, UserRole, User } from '@/lib/types';

interface SpaceContextType {
  currentSpace: Space;
  setSpace: (space: Space) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  canAccessSpace: (space: Space) => boolean;
  vendorContactId: string | null;
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

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [currentSpace, setCurrentSpace] = useState<Space>('internal');
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: '1',
    name: 'Alice Martin',
    email: 'alice@iainfinity.com',
    role: 'admin',
    vendorContactId: null,
    accountId: null,
  });

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
    <SpaceContext.Provider value={{ currentSpace, setSpace, currentUser, setCurrentUser, canAccessSpace, vendorContactId }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  const context = useContext(SpaceContext);
  if (!context) throw new Error('useSpace must be used within SpaceProvider');
  return context;
}

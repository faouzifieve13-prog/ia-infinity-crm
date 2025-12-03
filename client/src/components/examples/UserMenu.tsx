import { UserMenu } from '../UserMenu';
import { SpaceProvider } from '@/hooks/use-space';

export default function UserMenuExample() {
  return (
    <SpaceProvider>
      <UserMenu />
    </SpaceProvider>
  );
}

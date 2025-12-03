import { SpaceSwitcher } from '../SpaceSwitcher';
import { SpaceProvider } from '@/hooks/use-space';

export default function SpaceSwitcherExample() {
  return (
    <SpaceProvider>
      <SpaceSwitcher />
    </SpaceProvider>
  );
}

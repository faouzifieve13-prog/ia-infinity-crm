import { AppLayout } from '../layout/AppLayout';
import { ThemeProvider } from '@/hooks/use-theme';
import { SpaceProvider } from '@/hooks/use-space';

export default function AppLayoutExample() {
  return (
    <ThemeProvider>
      <SpaceProvider>
        <AppLayout>
          <div className="text-center text-muted-foreground p-12">
            Main content area
          </div>
        </AppLayout>
      </SpaceProvider>
    </ThemeProvider>
  );
}

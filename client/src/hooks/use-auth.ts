import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type UserRole = 'admin' | 'sales' | 'delivery' | 'finance' | 'client_admin' | 'client_member' | 'vendor';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

export interface AuthSession {
  authenticated: boolean;
  user?: AuthUser;
  role?: UserRole;
  space?: 'internal' | 'client' | 'vendor';
  accountId?: string | null;
  vendorContactId?: string | null;
}

async function fetchSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
  window.location.href = "/login";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery<AuthSession>({
    queryKey: ["/api/auth/session"],
    queryFn: fetchSession,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/session"], { authenticated: false });
    },
  });

  return {
    user: session?.authenticated ? session.user : null,
    role: session?.role,
    space: session?.space,
    accountId: session?.accountId,
    vendorContactId: session?.vendorContactId,
    isLoading,
    isAuthenticated: session?.authenticated ?? false,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

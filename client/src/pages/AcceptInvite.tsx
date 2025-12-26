import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AcceptInvite() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (token) {
      setLocation(`/setup-password?token=${token}`);
    } else {
      setLocation("/login");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

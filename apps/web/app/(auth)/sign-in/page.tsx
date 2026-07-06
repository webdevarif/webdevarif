import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";

import { isAuthpassConfigured } from "@/lib/auth/authpass";

import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Sign in · webdevarif",
};

export default function SignInPage() {
  return (
    <Card className="border-border/80 bg-card/90 shadow-[0_0_0_1px_rgba(186,255,4,0.04),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm showAuthpass={isAuthpassConfigured()} />
      </CardContent>
    </Card>
  );
}

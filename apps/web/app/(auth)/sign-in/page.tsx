import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";

import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Sign in · webdevarif",
};

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}

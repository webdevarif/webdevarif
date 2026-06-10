import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign in · webdevarif",
};

export default function SignUpPage() {
  redirect("/sign-in");
}

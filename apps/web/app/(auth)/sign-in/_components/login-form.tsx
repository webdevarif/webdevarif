"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, buttonVariants } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@kit/ui/form";
import { Input } from "@kit/ui/input";

import { useLogin } from "@/lib/auth/hooks";

import { loginSchema, type LoginInput } from "../_lib/schema";

const defaultValues: LoginInput = {
  email: "",
  password: "",
  rememberMe: false,
};

export function LoginForm({ showAuthpass }: { showAuthpass: boolean }) {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: "onBlur",
  });

  const login = useLogin();

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
              </FormControl>
              <FormLabel className="!mt-0 cursor-pointer font-normal">
                Remember me
              </FormLabel>
            </FormItem>
          )}
        />

        {login.error ? (
          <p className="text-sm text-destructive" role="alert">
            {login.error.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>

        {showAuthpass ? (
          <>
            <div className="relative py-1 text-center">
              <span className="relative bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
            </div>

            <a
              href="/api/auth/authpass/login"
              className={buttonVariants({
                variant: "outline",
                className: "w-full gap-2",
              })}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-3 text-black"
                  aria-hidden="true"
                >
                  <path
                    d="M7 10.5V8a5 5 0 0 1 10 0v2.5M6 10.5h12a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7.5a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                Auth<span className="font-bold text-emerald-500">Pass</span>
              </span>
            </a>
          </>
        ) : null}
      </form>
    </Form>
  );
}

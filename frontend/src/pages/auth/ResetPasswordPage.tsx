import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { api, extractErrorMessage } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

const schema = z
  .object({
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(8, "Minimum 8 characters"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      await api.post("/auth/reset-password", { token, password: values.password });
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-app-grid p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">Reset Password</h1>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <Input type="password" placeholder="New password" {...form.register("password")} />
            {form.formState.errors.password ? <p className="text-xs text-red-600">{form.formState.errors.password.message}</p> : null}
            <Input type="password" placeholder="Confirm password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword ? <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p> : null}
            {!token ? <p className="text-xs text-red-600">Missing token in query string.</p> : null}
            {mutation.isSuccess ? <p className="text-xs text-emerald-600">Password reset completed successfully.</p> : null}
            {mutation.isError ? <p className="text-xs text-red-600">{extractErrorMessage(mutation.error)}</p> : null}
            <Button type="submit" className="w-full" disabled={!token || mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Reset password"}
            </Button>
            <Link to="/login" className="block text-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
              Back to login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api, extractErrorMessage } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

const schema = z.object({ email: z.string().email("Enter valid email") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      await api.post("/auth/forgot-password", values);
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-app-grid p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">Forgot Password</h1>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <Input type="email" placeholder="Email" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs text-red-600">{form.formState.errors.email.message}</p> : null}
            {mutation.isSuccess ? <p className="text-xs text-emerald-600">Password reset instructions were sent if account exists.</p> : null}
            {mutation.isError ? <p className="text-xs text-red-600">{extractErrorMessage(mutation.error)}</p> : null}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Send reset link"}
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

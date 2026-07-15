import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, extractErrorMessage } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../context/ToastProvider";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function FormsPage() {
  const [otpEmail, setOtpEmail] = useState("");
  const { pushToast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const otpMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/request-otp", { email: otpEmail });
    },
    onSuccess: () => pushToast({ kind: "success", title: "OTP Requested", description: "Notification service accepted request." }),
    onError: (error) => pushToast({ kind: "error", title: "OTP Request Failed", description: extractErrorMessage(error) }),
  });

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold">Reusable Form Foundation</h1>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            pushToast({
              kind: "info",
              title: "Validated Form",
              description: `Form schema passed for ${values.email}`,
            });
          })}
        >
          <label className="block space-y-1 text-sm">
            <span>Name</span>
            <Input {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </label>

          <label className="block space-y-1 text-sm">
            <span>Email</span>
            <Input type="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </label>

          <label className="block space-y-1 text-sm">
            <span>Message</span>
            <Textarea {...form.register("message")} />
            <FieldError message={form.formState.errors.message?.message} />
          </label>

          <Button type="submit">Validate Form</Button>
        </form>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold">API-Connected Form Action</h2>
          <p className="text-xs text-slate-500">This form hits real backend notification OTP endpoint to verify action handling.</p>
          <Input
            placeholder="Email for OTP"
            type="email"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
          />
          <Button onClick={() => otpMutation.mutate()} disabled={!otpEmail || otpMutation.isPending}>
            Request OTP
          </Button>
          {otpMutation.isError ? <p className="text-xs text-red-600">{extractErrorMessage(otpMutation.error)}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

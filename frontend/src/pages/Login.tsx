import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { offlineEngine } from "../offline/engine";
import { useAuthStore } from "../store/authStore";
import type { AuthUser } from "../types/app";

type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setSession = useAuthStore((s) => s.setSession);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const permissions = useAuthStore((s) => s.permissions);

  const loginMutation = useMutation({
    mutationFn: async () => (await api.post<LoginResponse>("/auth/login", { email, password })).data,
    onSuccess: (payload) => {
      setSession(payload.user, payload.accessToken, payload.refreshToken);
      void offlineEngine.initialize(`${payload.user.id}:${payload.user.businessId ?? "default"}`);
      void offlineEngine.saveOfflineLoginProfile({
        email,
        password,
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        permissions,
      });
      navigate("/");
    },
    onError: () => {
      if (navigator.onLine) return;
      void (async () => {
        const profile = await offlineEngine.tryOfflineLogin(email, password);
        if (!profile) return;
        setSession(profile.user as AuthUser, profile.accessToken, profile.refreshToken);
        setPermissions(Array.isArray(profile.permissions) ? profile.permissions : []);
        navigate("/");
      })();
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-app-grid p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Enterprise Access</p>
          <h1 className="text-2xl font-semibold">Vyaparam Admin</h1>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium">Email</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Password</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {loginMutation.isError ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {extractErrorMessage(loginMutation.error)}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <Link to="/forgot-password" className="hover:text-slate-900 dark:hover:text-slate-100">
                Forgot password?
              </Link>
              <Link to="/reset-password" className="hover:text-slate-900 dark:hover:text-slate-100">
                Reset with token
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

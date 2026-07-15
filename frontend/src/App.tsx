import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/shell/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { Spinner } from "./components/ui/spinner";
import { PluginRouteGuard } from "./plugins/PluginRouteGuard";
import { usePluginPlatform } from "./plugins/runtime";

const LoginPage = lazy(() => import("./pages/Login"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));

const ForbiddenPage = lazy(() => import("./pages/system/ForbiddenPage"));
const MaintenancePage = lazy(() => import("./pages/system/MaintenancePage"));
const OfflinePage = lazy(() => import("./pages/system/OfflinePage"));
const SystemErrorPage = lazy(() => import("./pages/system/SystemErrorPage"));
const NotFoundPage = lazy(() => import("./pages/system/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner />
    </div>
  );
}

export default function App() {
  const { loading, routeItems, getRouteComponent } = usePluginPlatform();

  const routeMap = new Map<string, (typeof routeItems)[number]>();
  for (const route of routeItems) {
    if (!routeMap.has(route.path)) {
      routeMap.set(route.path, route);
    }
  }

  if (loading) {
    return (
      <BrowserRouter>
        <RouteFallback />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/500" element={<SystemErrorPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              {Array.from(routeMap.values()).map((route) => {
                const Component = getRouteComponent(route.path);
                if (!Component) return null;

                return (
                  <Route
                    key={`${route.pluginId}:${route.key}:${route.path}`}
                    path={route.path}
                    element={
                      <PluginRouteGuard route={route}>
                        <Component />
                      </PluginRouteGuard>
                    }
                  />
                );
              })}
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

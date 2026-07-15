import { Card, CardContent, CardHeader } from "../../components/ui/card";

export default function LayoutPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Layout Foundation</h1>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Collapsible sidebar with nested groups and responsive mobile behavior.</p>
          <p>Header includes quick search, breadcrumb, theme switcher, notification center, and profile menu.</p>
          <p>Footer is shared across all protected routes.</p>
          <p>All containers follow consistent spacing and typography scales.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Desktop</h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Multi-column content, persistent sidebar, full header tools.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Tablet</h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Reduced padding, adaptive command palette and controls.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Mobile</h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Off-canvas sidebar, compact header, touch-optimized hit targets.</CardContent>
        </Card>
      </div>
    </div>
  );
}

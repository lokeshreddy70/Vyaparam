import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import { Card, CardContent, CardHeader } from "../../components/ui/card";

type SalesPoint = {
  name: string;
  total: number;
};

function mapSeries(payload: unknown): SalesPoint[] {
  const rows = Array.isArray(payload) ? payload : ((payload as { items?: unknown[] } | undefined)?.items ?? []);
  return rows.slice(0, 12).map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      name: String(item.name ?? item.label ?? item.productName ?? `Point ${index + 1}`),
      total: Number(item.total ?? item.totalSales ?? item.amount ?? item.count ?? 0),
    };
  });
}

export default function ChartsPage() {
  const topProductsQuery = useQuery({
    queryKey: ["foundation-chart-top-products"],
    queryFn: async () => (await api.get("/reports-analytics/sales/top-products")).data,
  });

  const fastMovingQuery = useQuery({
    queryKey: ["foundation-chart-fast-moving"],
    queryFn: async () => (await api.get("/reports-analytics/inventory/fast-moving-products")).data,
  });

  const seriesA = mapSeries(topProductsQuery.data);
  const seriesB = mapSeries(fastMovingQuery.data);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Sales Series Foundation</h1>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={seriesA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Area dataKey="total" type="monotone" stroke="#0369a1" fill="#7dd3fc" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Inventory Movement Foundation</h2>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={seriesB}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Area dataKey="total" type="monotone" stroke="#15803d" fill="#86efac" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

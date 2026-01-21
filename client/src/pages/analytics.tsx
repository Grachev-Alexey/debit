import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { type AnalyticsData } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!analytics) return null;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

  const collectionRate = analytics.totalPlanned > 0 
    ? (analytics.totalActual / analytics.totalPlanned * 100).toFixed(1)
    : "0";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="link-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Аналитика продаж</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Планируемый доход (мес)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalPlanned)}</div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Фактический доход (мес)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Сбор: {collectionRate}% от плана
            </p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Филиалов в работе</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.byCompany.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Динамика поступлений</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="planned" name="План" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="Факт" stroke="hsl(var(--accent))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сравнение по филиалам</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byCompany}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="companyName" />
                <YAxis tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="planned" name="План" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Факт" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Детализация по филиалам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Филиал</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">План</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Факт</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">% Сбора</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {analytics.byCompany.map((company) => (
                  <tr key={company.companyId} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{company.companyName}</td>
                    <td className="p-4 align-middle text-right">{formatCurrency(company.planned)}</td>
                    <td className="p-4 align-middle text-right">{formatCurrency(company.actual)}</td>
                    <td className="p-4 align-middle text-right">
                      {company.planned > 0 ? (company.actual / company.planned * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

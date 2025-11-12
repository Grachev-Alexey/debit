import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Pencil } from "lucide-react";
import type { ClientSale, SalesFilters, InsertClientSale } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SaleFormDialog } from "@/components/SaleFormDialog";
import { formatCurrency, formatDate, getStatusLabel, getStatusVariant } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const [filters, setFilters] = useState<SalesFilters>({
    search: "",
    status: "all",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ClientSale | null>(null);
  const { toast } = useToast();

  // Построение query string для API
  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    const queryString = params.toString();
    return queryString ? `/api/sales?${queryString}` : "/api/sales";
  };

  const { data: sales, isLoading } = useQuery<ClientSale[]>({
    queryKey: [buildQueryKey(), filters],
  });

  // Мутация для создания новой продажи
  const createMutation = useMutation({
    mutationFn: async (data: InsertClientSale) => {
      return await apiRequest("POST", "/api/sales", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith("/api/sales") 
      });
      setDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Продажа успешно создана",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать продажу",
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления продажи
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertClientSale }) => {
      return await apiRequest("PATCH", `/api/sales/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith("/api/sales") 
      });
      setDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Продажа успешно обновлена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить продажу",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setEditingSale(null);
    setDialogOpen(true);
  };

  const handleEditClick = (sale: ClientSale) => {
    setEditingSale(sale);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: InsertClientSale) => {
    if (editingSale) {
      updateMutation.mutate({ id: editingSale.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Трекер продаж клиентов
          </h1>
          <Button onClick={handleAddClick} data-testid="button-add-sale">
            <Plus className="w-5 h-5 mr-2" />
            Добавить продажу
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Search and Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по телефону или ID продажи"
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value as any })}
            >
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-status">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="overdue">Просрочен</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">ID Продажи</TableHead>
                  <TableHead className="font-semibold">Телефон клиента</TableHead>
                  <TableHead className="font-semibold">Название</TableHead>
                  <TableHead className="font-semibold">Статус</TableHead>
                  <TableHead className="font-semibold text-right">Сумма</TableHead>
                  <TableHead className="font-semibold">Дата след. платежа</TableHead>
                  <TableHead className="font-semibold text-center">Просрочка, дней</TableHead>
                  <TableHead className="font-semibold text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sales && sales.length > 0 ? (
                  sales.map((sale) => (
                    <TableRow key={sale.id} className="hover-elevate" data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="font-medium" data-testid={`text-sale-id-${sale.id}`}>
                        {sale.sale_id}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${sale.id}`}>
                        {sale.client_phone}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-title-${sale.id}`}>
                        {sale.subscription_title || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(sale.status)}
                          className="rounded-full"
                          data-testid={`badge-status-${sale.id}`}
                        >
                          {getStatusLabel(sale.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-cost-${sale.id}`}>
                        {formatCurrency(sale.total_cost)}
                      </TableCell>
                      <TableCell data-testid={`text-next-payment-${sale.id}`}>
                        {formatDate(sale.next_payment_date)}
                      </TableCell>
                      <TableCell
                        className={`text-center tabular-nums ${
                          sale.overdue_days > 0 ? 'bg-destructive/10 text-destructive font-semibold' : ''
                        }`}
                        data-testid={`text-overdue-${sale.id}`}
                      >
                        {sale.overdue_days}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(sale)}
                          data-testid={`button-edit-${sale.id}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-medium">Продажи не найдены</p>
                        <p className="text-sm">Попробуйте изменить фильтры или добавьте новую продажу</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Sale Form Dialog */}
      <SaleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingSale={editingSale}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

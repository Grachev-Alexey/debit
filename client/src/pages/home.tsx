import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { Plus, Search, Pencil, ChevronLeft, ChevronRight, Calendar, MessageSquare, FileText, ExternalLink } from "lucide-react";
import type { ClientSale, SalesFilters, InsertClientSale, PaymentScheduleEntry } from "@shared/schema";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleFormDialog } from "@/components/SaleFormDialog";
import { PaymentScheduleView } from "@/components/PaymentScheduleView";
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ClientSale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast} = useToast();

  // Debounce search to reduce API calls
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Построение query string для API
  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    const queryString = params.toString();
    return queryString ? `/api/sales?${queryString}` : "/api/sales";
  };

  const { data: allSales, isLoading } = useQuery<ClientSale[]>({
    queryKey: [buildQueryKey(), debouncedSearch, filters.status],
  });

  // Client-side pagination
  const paginatedSales = useMemo(() => {
    if (!allSales) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allSales.slice(startIndex, endIndex);
  }, [allSales, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((allSales?.length || 0) / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.status]);

  // Мутация для создания нового абонемента
  const createMutation = useMutation({
    mutationFn: async (data: InsertClientSale) => {
      return await apiRequest("POST", "/api/sales", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0]?.toString().startsWith("/api/sales"))
      });
      setDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Абонемент успешно создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать абонемент",
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления абонемента
  const updateMutation = useMutation<ClientSale, Error, { id: number; data: Partial<InsertClientSale> }>({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertClientSale> }): Promise<ClientSale> => {
      const response = await apiRequest("PATCH", `/api/sales/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedSale) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0]?.toString().startsWith("/api/sales"))
      });
      
      if (selectedSale && updatedSale && updatedSale.id === selectedSale.id) {
        setSelectedSale(updatedSale);
      }
      
      if (dialogOpen) {
        setDialogOpen(false);
        toast({
          title: "Успешно",
          description: "Абонемент успешно обновлён",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить абонемент",
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

  const handleViewDetails = (sale: ClientSale) => {
    setSelectedSale(sale);
    setDetailsDialogOpen(true);
  };

  const handleScheduleUpdate = (schedule: PaymentScheduleEntry[]) => {
    if (!selectedSale) return;

    updateMutation.mutate({
      id: selectedSale.id,
      data: { payment_schedule: schedule }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Дебиторка
          </h1>
          <Button onClick={handleAddClick} data-testid="button-add-sale">
            <Plus className="w-5 h-5 mr-2" />
            Добавить абонемент
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
                placeholder="Поиск по телефону"
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
                <SelectItem value="underpaid">Недоплата</SelectItem>
                <SelectItem value="paid_off">Погашен</SelectItem>
                <SelectItem value="completed">Полностью оплачен</SelectItem>
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
                  <TableHead className="font-semibold">Телефон клиента</TableHead>
                  <TableHead className="font-semibold">Название</TableHead>
                  <TableHead className="font-semibold">Дата покупки</TableHead>
                  <TableHead className="font-semibold">Статус</TableHead>
                  <TableHead className="font-semibold text-right">Общая сумма</TableHead>
                  <TableHead className="font-semibold text-center">Прогресс</TableHead>
                  <TableHead className="font-semibold">След. платёж</TableHead>
                  <TableHead className="font-semibold text-center">Просрочка</TableHead>
                  <TableHead className="font-semibold">Комментарии</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedSales && paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <TableRow key={sale.id} className="hover-elevate" data-testid={`row-sale-${sale.id}`}>
                      <TableCell data-testid={`text-phone-${sale.id}`}>
                        {sale.client_phone}
                      </TableCell>
                      <TableCell className="max-w-md" data-testid={`text-title-${sale.id}`}>
                        <div className="line-clamp-2">
                          {sale.subscription_title || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-purchase-date-${sale.id}`}>
                        {formatDate(sale.purchase_date)}
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
                      <TableCell className="text-center" data-testid={`text-progress-${sale.id}`}>
                        {sale.is_installment && sale.total_payments ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="w-full bg-muted rounded-full h-2 max-w-[100px]">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all" 
                                style={{ 
                                  width: `${Math.min(100, ((sale.payments_made_count || 0) / sale.total_payments) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {sale.payments_made_count || 0} из {sale.total_payments}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-next-payment-${sale.id}`}>
                        {sale.is_fully_paid || sale.status === 'completed' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{formatDate(sale.next_payment_date)}</span>
                            {sale.next_payment_amount && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(sale.next_payment_amount)}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-center tabular-nums ${
                          sale.overdue_days > 0 ? 'bg-destructive/10 text-destructive font-semibold' : ''
                        }`}
                        data-testid={`text-overdue-${sale.id}`}
                      >
                        {sale.overdue_days > 0 ? `${sale.overdue_days} дн.` : '—'}
                      </TableCell>
                      <TableCell className="max-w-xs" data-testid={`text-comments-${sale.id}`}>
                        {sale.comments ? (
                          <div className="line-clamp-2 text-sm text-muted-foreground">
                            {sale.comments}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {sale.pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(sale.pdf_url!, '_blank')}
                              data-testid={`button-view-contract-${sale.id}`}
                              title="Открыть договор"
                            >
                              <FileText className="w-5 h-5" />
                            </Button>
                          )}
                          {sale.payment_schedule && sale.payment_schedule.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(sale)}
                              data-testid={`button-view-details-${sale.id}`}
                              title="График платежей"
                            >
                              <Calendar className="w-5 h-5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(sale)}
                            data-testid={`button-edit-${sale.id}`}
                          >
                            <Pencil className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-medium">Абонементы не найдены</p>
                        <p className="text-sm">Попробуйте изменить фильтры или добавьте новый абонемент</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allSales?.length || 0)} из {allSales?.length || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Вперёд
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Sale Form Dialog */}
      <SaleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingSale={editingSale}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Payment Schedule Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Детали абонемента</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">
                  <Calendar className="w-4 h-4 mr-2" />
                  График платежей
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Комментарии
                </TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-4">
                <PaymentScheduleView
                  sale={selectedSale}
                  onScheduleUpdate={handleScheduleUpdate}
                />
              </TabsContent>
              <TabsContent value="comments" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2">Комментарии менеджера</h3>
                    {selectedSale.comments ? (
                      <p className="text-sm whitespace-pre-wrap">{selectedSale.comments}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Комментарии отсутствуют</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Информация о клиенте</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Телефон:</strong> {selectedSale.client_phone}</p>
                        <p><strong>Абонемент:</strong> {selectedSale.subscription_title}</p>
                        <p><strong>Дата покупки:</strong> {formatDate(selectedSale.purchase_date)}</p>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Финансовая информация</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Общая сумма:</strong> {formatCurrency(selectedSale.total_cost)}</p>
                        <p><strong>Рассрочка:</strong> {selectedSale.is_installment ? 'Да' : 'Нет'}</p>
                        {selectedSale.is_installment && (
                          <p><strong>Платежей:</strong> {selectedSale.payments_made_count || 0} из {selectedSale.total_payments || 0}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedSale.pdf_url && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedSale.pdf_url!, '_blank')}
                        className="w-full max-w-md"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Открыть договор
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

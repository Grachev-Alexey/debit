import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { Plus, Search, Pencil, ChevronLeft, ChevronRight, Calendar, MessageSquare, FileText, ExternalLink, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import type { ClientSale, SalesFilters, InsertClientSale, PaymentScheduleEntry, SortField, SortOrder } from "@shared/schema";
import { STUDIOS, getStudioName } from "@shared/constants";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    sortBy: "purchase_date",
    sortOrder: "desc",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ClientSale | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ClientSale | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<ClientSale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast} = useToast();

  // Debounce search fields to reduce API calls
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedClientName = useDebouncedValue(filters.clientName, 300);
  const debouncedMasterName = useDebouncedValue(filters.masterName, 300);

  // Extract filter values for proper dependency tracking
  const { status, companyId, purchaseDateRange, nextPaymentDateRange, sortBy, sortOrder } = filters;

  // Построение query string для API - memoized для правильного кэширования
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedClientName) params.set("clientName", debouncedClientName);
    if (status && status !== "all") params.set("status", status);
    if (companyId) params.set("companyId", String(companyId));
    if (debouncedMasterName) params.set("masterName", debouncedMasterName);
    if (purchaseDateRange?.from) params.set("purchaseDateFrom", purchaseDateRange.from);
    if (purchaseDateRange?.to) params.set("purchaseDateTo", purchaseDateRange.to);
    if (nextPaymentDateRange?.from) params.set("nextPaymentDateFrom", nextPaymentDateRange.from);
    if (nextPaymentDateRange?.to) params.set("nextPaymentDateTo", nextPaymentDateRange.to);
    if (filters.isFrozen !== undefined) params.set("isFrozen", String(filters.isFrozen));
    if (filters.isRefund !== undefined) params.set("isRefund", String(filters.isRefund));
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    const queryString = params.toString();
    return queryString ? `/api/sales?${queryString}` : "/api/sales";
  }, [debouncedSearch, debouncedClientName, status, companyId, debouncedMasterName, purchaseDateRange, nextPaymentDateRange, filters.isFrozen, filters.isRefund, sortBy, sortOrder]);

  const { data: allSales, isLoading } = useQuery<ClientSale[]>({
    queryKey: [apiUrl],
    queryFn: async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  // Client-side pagination
  const paginatedSales = useMemo(() => {
    if (!allSales) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allSales.slice(startIndex, endIndex);
  }, [allSales, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((allSales?.length || 0) / itemsPerPage);

  // Helper function to handle column sorting
  const handleSort = (field: SortField) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  // Helper function to get sort icon
  const getSortIcon = (field: SortField) => {
    if (filters.sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return filters.sortOrder === "asc" ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, debouncedClientName, filters.status, filters.companyId, debouncedMasterName, filters.purchaseDateRange, filters.nextPaymentDateRange, filters.isFrozen, filters.isRefund, filters.sortBy, filters.sortOrder]);

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

  // Мутация для удаления абонемента
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/sales/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0]?.toString().startsWith("/api/sales"))
      });
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      toast({
        title: "Успешно",
        description: "Абонемент успешно удалён",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить абонемент",
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

  const handleDeleteClick = (sale: ClientSale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete.id);
    }
  };

  const handleScheduleUpdate = (schedule: PaymentScheduleEntry[]) => {
    if (!selectedSale) return;

    updateMutation.mutate({
      id: selectedSale.id,
      data: { payment_schedule: schedule }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Дебиторка
          </h1>
          <Button onClick={handleAddClick} size="sm" data-testid="button-add-sale">
            <Plus className="w-4 h-4 mr-2" />
            Добавить абонемент
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col p-6 lg:p-8 gap-6">
        {/* Search and Filters */}
        <Card className="p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Search by phone */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по телефону"
                className="pl-10"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search"
              />
            </div>

            {/* Search by client name */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени клиента"
                className="pl-10"
                value={filters.clientName || ""}
                onChange={(e) => setFilters({ ...filters, clientName: e.target.value || undefined })}
                data-testid="input-filter-client-name"
              />
            </div>

            {/* Status filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => setFilters({ ...filters, status: value as any })}
            >
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Статус" />
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

            {/* Additional filters in popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-more-filters">
                  <Filter className="w-4 h-4 mr-2" />
                  Ещё фильтры
                  {(filters.companyId || filters.masterName || filters.purchaseDateRange || filters.nextPaymentDateRange || filters.isFrozen || filters.isRefund) && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px]" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Дополнительные фильтры</h4>
                  </div>

                  {/* Studio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Студия</label>
                    <Select
                      value={filters.companyId?.toString() || "all"}
                      onValueChange={(value) => setFilters({ ...filters, companyId: value === "all" ? undefined : Number(value) })}
                    >
                      <SelectTrigger data-testid="select-filter-studio">
                        <SelectValue placeholder="Все студии" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все студии</SelectItem>
                        {STUDIOS.map((studio) => (
                          <SelectItem key={studio.id} value={studio.id.toString()}>
                            {studio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Master */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Мастер</label>
                    <Input
                      placeholder="ФИО мастера"
                      value={filters.masterName || ""}
                      onChange={(e) => setFilters({ ...filters, masterName: e.target.value || undefined })}
                      data-testid="input-filter-master"
                    />
                  </div>

                  {/* Purchase date range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Дата покупки</label>
                    <DateRangePicker
                      value={filters.purchaseDateRange}
                      onChange={(range) => setFilters({ ...filters, purchaseDateRange: range })}
                      placeholder="Выберите диапазон"
                    />
                  </div>

                  {/* Next payment date range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Следующий платеж</label>
                    <DateRangePicker
                      value={filters.nextPaymentDateRange}
                      onChange={(range) => setFilters({ ...filters, nextPaymentDateRange: range })}
                      placeholder="Выберите диапазон"
                    />
                  </div>

                  {/* Frozen filter */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-frozen"
                      checked={filters.isFrozen === true}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, isFrozen: checked ? true : undefined })
                      }
                      data-testid="checkbox-filter-frozen"
                    />
                    <label htmlFor="filter-frozen" className="text-sm font-medium cursor-pointer">
                      Только замороженные
                    </label>
                  </div>

                  {/* Refund filter */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-refund"
                      checked={filters.isRefund === true}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, isRefund: checked ? true : undefined })
                      }
                      data-testid="checkbox-filter-refund"
                    />
                    <label htmlFor="filter-refund" className="text-sm font-medium cursor-pointer">
                      Только с возвратом
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear filters button */}
            {(filters.search || filters.clientName || filters.status !== "all" || filters.companyId || filters.masterName || 
              filters.purchaseDateRange || filters.nextPaymentDateRange || filters.isFrozen || filters.isRefund) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ search: "", status: "all", sortBy: "purchase_date", sortOrder: "desc" })}
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-auto overflow-x-auto">
            <Table className="text-sm min-w-[1400px]">
              <TableHeader className="bg-muted/50">
                <TableRow className="h-10">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[110px]">Телефон</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-[150px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("client_name")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-client-name"
                    >
                      Клиент
                      {getSortIcon("client_name")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold w-[130px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("master_name")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-master-name"
                    >
                      Мастер
                      {getSortIcon("master_name")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold w-[100px]">Студия</TableHead>
                  <TableHead className="font-semibold max-w-[200px]">Название</TableHead>
                  <TableHead className="font-semibold w-[100px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("purchase_date")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-purchase-date"
                    >
                      Дата
                      {getSortIcon("purchase_date")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold w-[100px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("status")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-status"
                    >
                      Статус
                      {getSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-right w-[90px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("total_cost")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-total-cost"
                    >
                      Сумма
                      {getSortIcon("total_cost")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-center w-[110px]">Прогресс</TableHead>
                  <TableHead className="font-semibold w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("next_payment_date")}
                      className="font-semibold p-0 h-auto hover:bg-transparent"
                      data-testid="button-sort-next-payment"
                    >
                      След. пл.
                      {getSortIcon("next_payment_date")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-center w-[80px]">Просроч.</TableHead>
                  <TableHead className="font-semibold text-center w-[70px]">Зам.</TableHead>
                  <TableHead className="font-semibold text-center w-[70px]">Возврат</TableHead>
                  <TableHead className="font-semibold max-w-[150px]">Коммент.</TableHead>
                  <TableHead className="font-semibold text-right w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedSales && paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <TableRow key={sale.id} className="hover-elevate h-10" data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="py-2" data-testid={`text-phone-${sale.id}`}>
                        {sale.client_phone}
                      </TableCell>
                      <TableCell className="py-2" data-testid={`text-client-name-${sale.id}`}>
                        <span className={!sale.client_name ? "text-muted-foreground" : ""}>
                          {sale.client_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2" data-testid={`text-master-name-${sale.id}`}>
                        <span className={!sale.master_name ? "text-muted-foreground" : ""}>
                          {sale.master_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2" data-testid={`text-studio-${sale.id}`}>
                        <span className={!sale.yclients_company_id ? "text-muted-foreground" : ""}>
                          {getStudioName(sale.yclients_company_id) || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs py-2" data-testid={`text-title-${sale.id}`}>
                        <div className="line-clamp-2">
                          {sale.subscription_title || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-2" data-testid={`text-purchase-date-${sale.id}`}>
                        {formatDate(sale.purchase_date)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={getStatusVariant(sale.status)}
                          className="rounded-full text-xs"
                          data-testid={`badge-status-${sale.id}`}
                        >
                          {getStatusLabel(sale.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-2" data-testid={`text-cost-${sale.id}`}>
                        {formatCurrency(sale.total_cost)}
                      </TableCell>
                      <TableCell className="text-center py-2" data-testid={`text-progress-${sale.id}`}>
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
                      <TableCell className="py-2" data-testid={`text-next-payment-${sale.id}`}>
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
                        className={`text-center tabular-nums py-2 ${
                          sale.overdue_days > 0 ? 'bg-destructive/10 text-destructive font-semibold' : ''
                        }`}
                        data-testid={`text-overdue-${sale.id}`}
                      >
                        {sale.overdue_days > 0 ? `${sale.overdue_days} дн.` : '—'}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Checkbox
                          checked={sale.is_frozen}
                          onCheckedChange={(checked) => {
                            updateMutation.mutate({
                              id: sale.id,
                              data: { is_frozen: !!checked }
                            });
                          }}
                          data-testid={`checkbox-frozen-${sale.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Checkbox
                          checked={sale.is_refund}
                          onCheckedChange={(checked) => {
                            updateMutation.mutate({
                              id: sale.id,
                              data: { is_refund: !!checked }
                            });
                          }}
                          data-testid={`checkbox-refund-${sale.id}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs py-2" data-testid={`text-comments-${sale.id}`}>
                        {sale.comments ? (
                          <div className="line-clamp-2 text-sm text-muted-foreground">
                            {sale.comments}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex gap-1 justify-end flex-wrap">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(sale)}
                            data-testid={`button-view-details-${sale.id}`}
                            title={sale.payment_schedule && sale.payment_schedule.length > 0 ? "График платежей" : "Создать график платежей"}
                            className={!sale.payment_schedule || sale.payment_schedule.length === 0 ? "text-muted-foreground" : ""}
                          >
                            <Calendar className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(sale)}
                            data-testid={`button-edit-${sale.id}`}
                            title="Редактировать"
                          >
                            <Pencil className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(sale)}
                            data-testid={`button-delete-${sale.id}`}
                            title="Удалить"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
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
          <div className="flex items-center justify-between flex-shrink-0">
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
        </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить абонемент {saleToDelete?.client_name ? `для клиента ${saleToDelete.client_name}` : 'этого клиента'}?
              <br />
              <span className="text-destructive font-medium">Это действие нельзя отменить.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" disabled={deleteMutation.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

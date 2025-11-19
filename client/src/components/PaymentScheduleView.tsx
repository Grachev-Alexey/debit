import { useState } from "react";
import { type PaymentScheduleEntry, type PaymentHistoryEntry, type ClientSale } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CheckCircle2, AlertCircle, Clock, Edit } from "lucide-react";
import { PaymentScheduleEditor } from "./PaymentScheduleEditor";

interface PaymentScheduleViewProps {
  sale: ClientSale;
  onScheduleUpdate: (schedule: PaymentScheduleEntry[]) => void;
}

export function PaymentScheduleView({ sale, onScheduleUpdate }: PaymentScheduleViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const paymentSchedule = sale.payment_schedule || [];
  
  // Отделяем первоначальный платёж от остальных
  // Показываем в карточке только если это payment_number = 1 И есть planned_date
  const initialPayment = paymentSchedule.find(p => {
    return p.payment_number === 1 && p.planned_date !== undefined && p.planned_amount !== undefined;
  });
  
  const remainingPayments = paymentSchedule.filter(p => {
    const isLegacy = p.date !== undefined && p.amount !== undefined;
    
    // Если это payment_number = 1:
    // - Если есть в initialPayment (с данными) - НЕ показываем в таблице
    // - Если нет данных - показываем в таблице как fallback
    if (p.payment_number === 1) {
      return !initialPayment; // Показать в таблице только если не в карточке
    }
    
    // Legacy записи всегда в таблице
    // Остальные новые записи (payment_number > 1) тоже в таблице
    return true;
  });

  const isLegacyFormat = (payment: PaymentScheduleEntry): boolean => {
    return payment.date !== undefined && payment.amount !== undefined;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "paid":
        return (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Оплачен</span>
          </div>
        );
      case "overdue":
        return (
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Просрочен</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Ожидается</span>
          </div>
        );
    }
  };

  if (!paymentSchedule || paymentSchedule.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground p-8 text-center border rounded-lg bg-muted/30">
          <p className="font-medium mb-2">График платежей не указан</p>
          <p className="text-xs">Нажмите "Редактировать график" чтобы добавить платежи</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Создать график платежей
          </Button>
        </div>
        {isEditing && (
          <PaymentScheduleEditor
            schedule={paymentSchedule}
            onSave={(schedule) => {
              onScheduleUpdate(schedule);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <PaymentScheduleEditor
        schedule={paymentSchedule}
        onSave={(schedule) => {
          onScheduleUpdate(schedule);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const handleRegenerateSchedule = () => {
    if (!paymentSchedule || paymentSchedule.length === 0) {
      alert("График платежей пуст. Сначала создайте график.");
      return;
    }

    // Функция для добавления месяцев к дате в русском формате DD.MM.YYYY
    const addMonthsToDate = (dateStr: string, monthsToAdd: number): string => {
      let d: Date;
      
      // Парсим дату из русского формата DD.MM.YYYY
      if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          d = new Date(dateStr);
        }
      } else {
        d = new Date(dateStr);
      }

      // Добавляем месяцы
      d.setMonth(d.getMonth() + monthsToAdd);

      // Возвращаем в русском формате DD.MM.YYYY
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}.${month}.${year}`;
    };

    // Пересчитываем график платежей
    const updatedSchedule = paymentSchedule.map((payment) => {
      // Для первого платежа (payment_number === 1) используем дату покупки
      // Для остальных - дата покупки + (payment_number - 1) месяцев
      const monthsFromPurchase = payment.payment_number - 1;
      
      // Преобразуем purchase_date в строку формата DD.MM.YYYY
      const purchaseDateStr = formatDate(sale.purchase_date);
      
      // Вычисляем новую planned_date
      const newPlannedDate = addMonthsToDate(purchaseDateStr, monthsFromPurchase);

      // Создаем новый объект, явно указывая только нужные поля
      const updatedPayment: PaymentScheduleEntry = {
        payment_number: payment.payment_number,
        planned_date: newPlannedDate,
        planned_amount: payment.planned_amount,
      };

      // Добавляем опциональные поля только если они определены
      if (payment.status) {
        updatedPayment.status = payment.status;
      }
      if (payment.actual_date) {
        updatedPayment.actual_date = payment.actual_date;
      }
      if (payment.actual_amount !== undefined) {
        updatedPayment.actual_amount = payment.actual_amount;
      }
      if (payment.difference !== undefined) {
        updatedPayment.difference = payment.difference;
      }
      if (payment.discrepancy) {
        updatedPayment.discrepancy = payment.discrepancy;
      }

      // Legacy поля (если они есть)
      if (payment.date) {
        updatedPayment.date = payment.date;
      }
      if (payment.amount !== undefined) {
        updatedPayment.amount = payment.amount;
      }
      if (payment.description) {
        updatedPayment.description = payment.description;
      }

      return updatedPayment;
    });

    // Сохраняем обновленный график
    onScheduleUpdate(updatedSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h3 className="text-lg font-semibold">График платежей</h3>
        <div className="flex gap-2">
          <Button onClick={handleRegenerateSchedule} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Пересчитать график
          </Button>
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
        </div>
      </div>

      {/* Первоначальный платёж - отдельная карточка */}
      {initialPayment && initialPayment.planned_date && initialPayment.planned_amount !== undefined && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Первоначальный взнос
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Статус</p>
              {getStatusBadge(initialPayment.status)}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">План. дата</p>
              <p className="text-sm font-medium">
                {formatDate(initialPayment.planned_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">План. сумма</p>
              <p className="text-sm font-medium">{formatCurrency(initialPayment.planned_amount)}</p>
            </div>
            {initialPayment.actual_date && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Факт. дата</p>
                  <p className="text-sm font-medium">
                    {formatDate(initialPayment.actual_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Факт. сумма</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(initialPayment.actual_amount ?? initialPayment.planned_amount)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Оставшиеся платежи в таблице */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">№</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>План. дата</TableHead>
              <TableHead>План. сумма</TableHead>
              <TableHead>Факт. дата</TableHead>
              <TableHead>Факт. сумма</TableHead>
              <TableHead>Разница</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remainingPayments.map((payment, index) => {
              const isLegacy = isLegacyFormat(payment);
              
              const paymentNumber = isLegacy ? index + 1 : payment.payment_number;
              const plannedDate = isLegacy ? payment.date : payment.planned_date;
              const plannedAmount = isLegacy ? payment.amount : payment.planned_amount;
              const status = isLegacy ? undefined : payment.status;
              const actualDate = isLegacy ? undefined : payment.actual_date;
              const actualAmount = isLegacy ? undefined : payment.actual_amount;
              
              const difference = actualAmount && plannedAmount
                ? actualAmount - plannedAmount
                : 0;

              return (
                <TableRow key={isLegacy ? index : payment.payment_number}>
                  <TableCell className="font-semibold">{paymentNumber}</TableCell>
                  <TableCell>{getStatusBadge(status)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(plannedDate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {plannedAmount !== undefined ? formatCurrency(plannedAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {actualDate ? (
                      <span className="text-green-700 dark:text-green-400">
                        {formatDate(actualDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {actualAmount ? (
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {formatCurrency(actualAmount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {difference !== 0 ? (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={difference > 0 ? "default" : "destructive"}
                          className={difference > 0 ? "bg-blue-500" : ""}
                        >
                          {difference > 0 ? "+" : ""}{formatCurrency(Math.abs(difference))}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {difference > 0 ? "переплата" : "недоплата"}
                        </span>
                      </div>
                    ) : status === "paid" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Точно
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Всего платежей</p>
          <p className="text-2xl font-bold">{paymentSchedule.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Оплачено</p>
          <p className="text-2xl font-bold text-green-600">
            {paymentSchedule.filter(p => p.status === "paid").length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Ожидается</p>
          <p className="text-2xl font-bold text-blue-600">
            {paymentSchedule.filter(p => p.status !== "paid").length}
          </p>
        </div>
      </div>
    </div>
  );
}

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
import { formatCurrency } from "@/lib/formatters";
import { CheckCircle2, AlertCircle, Clock, Edit } from "lucide-react";
import { PaymentScheduleEditor } from "./PaymentScheduleEditor";

interface PaymentScheduleViewProps {
  sale: ClientSale;
  onScheduleUpdate: (schedule: PaymentScheduleEntry[]) => void;
}

export function PaymentScheduleView({ sale, onScheduleUpdate }: PaymentScheduleViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const paymentSchedule = sale.payment_schedule || [];

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">График платежей</h3>
        <Button onClick={() => setIsEditing(true)} variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Редактировать график
        </Button>
      </div>

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
            {paymentSchedule.map((payment, index) => {
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
                  <TableCell className="text-sm">{plannedDate}</TableCell>
                  <TableCell className="font-medium">
                    {plannedAmount !== undefined ? formatCurrency(plannedAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {actualDate ? (
                      <span className="text-green-700 dark:text-green-400">{actualDate}</span>
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

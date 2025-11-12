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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateForInput } from "@/lib/formatters";
import { CheckCircle2, Circle } from "lucide-react";

interface PaymentScheduleViewProps {
  sale: ClientSale;
  onPaymentComplete: (paymentIndex: number, paidDate: string, paidAmount: number) => void;
}

export function PaymentScheduleView({ sale, onPaymentComplete }: PaymentScheduleViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  const [paidDate, setPaidDate] = useState(formatDateForInput(new Date()));
  const [paidAmount, setPaidAmount] = useState("");

  const paymentSchedule = sale.payment_schedule || [];
  const paymentHistory = sale.payment_history || [];

  const handleMarkAsPaid = (index: number, scheduledAmount: number) => {
    setSelectedPaymentIndex(index);
    setPaidAmount(String(scheduledAmount));
    setPaidDate(formatDateForInput(new Date()));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedPaymentIndex !== null && paidAmount && paidDate) {
      onPaymentComplete(selectedPaymentIndex, paidDate, parseFloat(paidAmount));
      setDialogOpen(false);
      setSelectedPaymentIndex(null);
      setPaidAmount("");
      setPaidDate(formatDateForInput(new Date()));
    }
  };

  const isPaymentPaid = (index: number): PaymentHistoryEntry | undefined => {
    return paymentHistory.find(h => h.paymentIndex === index);
  };

  if (!paymentSchedule || paymentSchedule.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        График платежей не указан
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Статус</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Запланировано</TableHead>
            <TableHead>Оплачено</TableHead>
            <TableHead>Дата оплаты</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentSchedule.map((payment, index) => {
            const paidInfo = isPaymentPaid(index);
            const isPaid = !!paidInfo;

            return (
              <TableRow key={index}>
                <TableCell>
                  {isPaid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </TableCell>
                <TableCell>{payment.date}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>
                  {isPaid && paidInfo ? (
                    <span className="font-medium text-green-600">
                      {formatCurrency(paidInfo.paidAmount)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {isPaid && paidInfo ? (
                    <span className="text-sm">{paidInfo.paidDate}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {!isPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsPaid(index, payment.amount)}
                    >
                      Отметить оплату
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отметить платёж как оплаченный</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid-date">Дата оплаты</Label>
              <Input
                id="paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="paid-amount">Сумма оплаты</Label>
              <Input
                id="paid-amount"
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

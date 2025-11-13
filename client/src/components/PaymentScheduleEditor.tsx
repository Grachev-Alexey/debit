import { useState } from "react";
import { PaymentScheduleEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

interface PaymentScheduleEditorProps {
  schedule: PaymentScheduleEntry[] | null;
  onSave: (schedule: PaymentScheduleEntry[]) => void;
  onCancel: () => void;
}

export function PaymentScheduleEditor({ schedule, onSave, onCancel }: PaymentScheduleEditorProps) {
  const [editedSchedule, setEditedSchedule] = useState<PaymentScheduleEntry[]>(
    schedule || []
  );

  const handleAddPayment = () => {
    const newPayment: PaymentScheduleEntry = {
      payment_number: editedSchedule.length + 1,
      planned_date: new Date().toISOString().split('T')[0],
      planned_amount: 0,
      status: "pending",
    };
    setEditedSchedule([...editedSchedule, newPayment]);
  };

  const handleRemovePayment = (index: number) => {
    const updated = editedSchedule.filter((_, i) => i !== index);
    const renumbered = updated.map((payment, i) => ({
      ...payment,
      payment_number: i + 1,
    }));
    setEditedSchedule(renumbered);
  };

  const handleUpdatePayment = (index: number, field: keyof PaymentScheduleEntry, value: any) => {
    const updated = [...editedSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setEditedSchedule(updated);
  };

  const convertDateToRussianFormat = (isoDate: string): string => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleSave = () => {
    const formattedSchedule = editedSchedule.map(payment => ({
      ...payment,
      planned_date: convertDateToRussianFormat(payment.planned_date),
      actual_date: payment.actual_date ? convertDateToRussianFormat(payment.actual_date) : undefined,
    }));
    onSave(formattedSchedule);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-500">Оплачен</Badge>;
      case "overdue":
        return <Badge variant="destructive">Просрочен</Badge>;
      default:
        return <Badge variant="secondary">Ожидается</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Редактирование графика платежей</h3>
        <div className="flex gap-2">
          <Button onClick={handleAddPayment} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Добавить платёж
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {editedSchedule.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>График платежей пуст</p>
            <p className="text-sm mt-2">Нажмите "Добавить платёж" чтобы создать новый</p>
          </Card>
        ) : (
          editedSchedule.map((payment, index) => (
            <Card key={index} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">№{payment.payment_number}</span>
                  {getStatusBadge(payment.status)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePayment(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Плановая дата</Label>
                  <Input
                    type="date"
                    value={payment.planned_date && payment.planned_date.includes('.') ? 
                      payment.planned_date.split('.').reverse().join('-') : 
                      payment.planned_date || ''}
                    onChange={(e) => handleUpdatePayment(index, "planned_date", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Плановая сумма</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payment.planned_amount}
                    onChange={(e) =>
                      handleUpdatePayment(index, "planned_amount", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Статус</Label>
                  <Select
                    value={payment.status || "pending"}
                    onValueChange={(value) => handleUpdatePayment(index, "status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Ожидается</SelectItem>
                      <SelectItem value="paid">Оплачен</SelectItem>
                      <SelectItem value="overdue">Просрочен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payment.status === "paid" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Фактическая дата</Label>
                      <Input
                        type="date"
                        value={payment.actual_date && payment.actual_date.includes('.') ?
                          payment.actual_date.split('.').reverse().join('-') :
                          payment.actual_date || ''}
                        onChange={(e) => handleUpdatePayment(index, "actual_date", e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Фактическая сумма</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.actual_amount || payment.planned_amount}
                        onChange={(e) => {
                          const actualAmount = parseFloat(e.target.value) || 0;
                          const difference = actualAmount - payment.planned_amount;
                          let discrepancy: "overpaid" | "underpaid" | "exact" | undefined = "exact";
                          if (difference > 0) discrepancy = "overpaid";
                          else if (difference < 0) discrepancy = "underpaid";
                          
                          handleUpdatePayment(index, "actual_amount", actualAmount);
                          handleUpdatePayment(index, "difference", Math.abs(difference));
                          handleUpdatePayment(index, "discrepancy", discrepancy);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {payment.status === "paid" && payment.actual_amount && payment.actual_amount !== payment.planned_amount && (
                <div className={`p-2 rounded text-sm ${
                  (payment.actual_amount || 0) > payment.planned_amount
                    ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                    : 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
                }`}>
                  {(payment.actual_amount || 0) > payment.planned_amount
                    ? `Переплата: ${formatCurrency(Math.abs((payment.actual_amount || 0) - payment.planned_amount))}`
                    : `Недоплата: ${formatCurrency(Math.abs((payment.actual_amount || 0) - payment.planned_amount))}`}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Отмена
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Сохранить график
        </Button>
      </div>
    </div>
  );
}

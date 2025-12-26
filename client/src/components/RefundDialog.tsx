import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  currentAmount?: number | null;
}

export function RefundDialog({
  open,
  onOpenChange,
  onConfirm,
  currentAmount,
}: RefundDialogProps) {
  const [amount, setAmount] = useState<string>(
    currentAmount ? String(currentAmount) : ""
  );

  const handleConfirm = () => {
    const numAmount = parseFloat(amount) || 0;
    onConfirm(numAmount);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Внести сумму возврата</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Сумма возврата</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              data-testid="input-refund-amount"
            />
            {amount && (
              <p className="text-sm text-muted-foreground">
                К возврату: {formatCurrency(parseFloat(amount) || 0)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setAmount("");
            }}
            data-testid="button-cancel-refund"
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            data-testid="button-confirm-refund"
          >
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

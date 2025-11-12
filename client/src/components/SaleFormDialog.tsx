import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSaleSchema, type InsertClientSale, type ClientSale } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatDateForInput } from "@/lib/formatters";

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertClientSale) => void;
  editingSale?: ClientSale | null;
  isLoading?: boolean;
}

export function SaleFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editingSale,
  isLoading = false,
}: SaleFormDialogProps) {
  const form = useForm<InsertClientSale>({
    resolver: zodResolver(insertClientSaleSchema),
    defaultValues: {
      sale_id: 0,
      amocrm_lead_id: 0,
      yclients_client_id: null,
      yclients_company_id: null,
      client_phone: "",
      subscription_title: "",
      purchase_date: formatDateForInput(new Date()),
      total_cost: 0,
      is_installment: false,
      total_payments: null,
      payments_made_count: null,
      next_payment_date: null,
      next_payment_amount: null,
      is_fully_paid: false,
      status: "active",
      comments: null,
    },
  });

  useEffect(() => {
    if (editingSale) {
      form.reset({
        sale_id: editingSale.sale_id,
        amocrm_lead_id: editingSale.amocrm_lead_id,
        yclients_client_id: editingSale.yclients_client_id,
        yclients_company_id: editingSale.yclients_company_id,
        client_phone: editingSale.client_phone,
        subscription_title: editingSale.subscription_title || "",
        purchase_date: formatDateForInput(editingSale.purchase_date),
        total_cost: editingSale.total_cost,
        is_installment: editingSale.is_installment,
        total_payments: editingSale.total_payments,
        payments_made_count: editingSale.payments_made_count,
        next_payment_date: editingSale.next_payment_date ? formatDateForInput(editingSale.next_payment_date) : null,
        next_payment_amount: editingSale.next_payment_amount,
        is_fully_paid: editingSale.is_fully_paid,
        status: editingSale.status,
        comments: editingSale.comments || "",
      });
    } else {
      form.reset({
        sale_id: 0,
        amocrm_lead_id: 0,
        yclients_client_id: null,
        yclients_company_id: null,
        client_phone: "",
        subscription_title: "",
        purchase_date: formatDateForInput(new Date()),
        total_cost: 0,
        is_installment: false,
        total_payments: null,
        payments_made_count: null,
        next_payment_date: null,
        next_payment_amount: null,
        is_fully_paid: false,
        status: "active",
        comments: null,
      });
    }
  }, [editingSale, form]);

  const handleSubmit = (data: InsertClientSale) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {editingSale ? "Редактирование абонемента" : "Новый абонемент"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sale_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ID абонемента <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="123456"
                        data-testid="input-sale-id"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amocrm_lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ID сделки в AmoCRM <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="789012"
                        data-testid="input-amocrm-lead-id"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="client_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Телефон клиента <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      data-testid="input-client-phone"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscription_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название абонемента</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Премиум абонемент на 12 месяцев"
                      data-testid="input-subscription-title"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Дата покупки <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-purchase-date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Общая стоимость <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="50000"
                        data-testid="input-total-cost"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активен</SelectItem>
                        <SelectItem value="overdue">Просрочен</SelectItem>
                        <SelectItem value="underpaid">Недоплата</SelectItem>
                        <SelectItem value="paid_off">Погашен</SelectItem>
                        <SelectItem value="completed">Полностью оплачен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="next_payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата следующего платежа</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-next-payment-date"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_installment"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-installment"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal cursor-pointer">
                      Рассрочка
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_fully_paid"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-fully-paid"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal cursor-pointer">
                      Полностью оплачена
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="total_payments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Всего платежей</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        data-testid="input-total-payments"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payments_made_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сделано платежей</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        data-testid="input-payments-made-count"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="next_payment_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма след. платежа</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5000"
                        data-testid="input-next-payment-amount"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарии менеджера</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Добавьте комментарии к абонементу..."
                      className="resize-none"
                      rows={4}
                      data-testid="textarea-comments"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                data-testid="button-cancel"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Типы для работы с MySQL базой данных client_sales_tracker
// Эта схема отражает структуру существующей таблицы

export type SaleStatus = "active" | "overdue" | "underpaid" | "paid_off" | "completed";

export interface PaymentScheduleEntry {
  date: string;
  amount: number;
  description: string;
}

export interface PaymentHistoryEntry {
  paymentIndex: number;
  paidDate: string;
  paidAmount: number;
  note?: string;
}

export interface ClientSale {
  id: number;
  sale_id: number;
  amocrm_lead_id: number;
  yclients_client_id: number | null;
  yclients_company_id: number | null;
  client_phone: string;
  subscription_title: string | null;
  purchase_date: Date;
  total_cost: number;
  is_installment: boolean;
  payment_schedule: PaymentScheduleEntry[] | null;
  payment_history: PaymentHistoryEntry[] | null;
  total_payments: number | null;
  payments_made_count: number | null;
  next_payment_date: Date | null;
  next_payment_amount: number | null;
  overdue_days: number;
  is_fully_paid: boolean;
  status: SaleStatus;
  is_underpaid: boolean;
  underpayment_amount: number;
  comments: string | null;
  last_checked_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export const paymentScheduleEntrySchema = z.object({
  date: z.string(),
  amount: z.number().nonnegative({ message: "Сумма платежа не может быть отрицательной" }),
  description: z.string(),
});

export const paymentHistoryEntrySchema = z.object({
  paymentIndex: z.number().int().nonnegative({ message: "Индекс платежа должен быть неотрицательным" }),
  paidDate: z.string(),
  paidAmount: z.number().nonnegative({ message: "Сумма оплаты не может быть отрицательной" }),
  note: z.string().optional(),
});

// Схема для вставки новой продажи
export const insertClientSaleSchema = z.object({
  sale_id: z.coerce.number().int().positive({ message: "ID продажи обязателен" }),
  amocrm_lead_id: z.coerce.number().int().positive({ message: "ID сделки в AmoCRM обязателен" }),
  yclients_client_id: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().int().nullable().optional()
  ),
  yclients_company_id: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().int().nullable().optional()
  ),
  client_phone: z.string().min(1, { message: "Телефон клиента обязателен" }),
  subscription_title: z.string().nullable().optional(),
  purchase_date: z.string().min(1, { message: "Дата покупки обязательна" }),
  total_cost: z.coerce.number().positive({ message: "Общая стоимость должна быть положительной" }),
  is_installment: z.boolean().default(false),
  payment_schedule: z.array(paymentScheduleEntrySchema).nullable().optional(),
  payment_history: z.array(paymentHistoryEntrySchema).nullable().optional(),
  total_payments: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().int().nullable().optional()
  ),
  payments_made_count: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().int().nullable().optional()
  ),
  next_payment_date: z.string().nullable().optional(),
  next_payment_amount: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().nullable().optional()
  ),
  is_fully_paid: z.boolean().default(false),
  status: z.enum(["active", "overdue", "underpaid", "paid_off", "completed"], { 
    message: "Статус должен быть: active, overdue, underpaid, paid_off или completed" 
  }).default("active"),
  comments: z.string().nullable().optional(),
});

// Схема для обновления продажи (id добавляется отдельно)
export const updateClientSaleSchema = insertClientSaleSchema.partial();

export type InsertClientSale = z.infer<typeof insertClientSaleSchema>;
export type UpdateClientSale = z.infer<typeof updateClientSaleSchema>;

// Типы для фильтрации
export type SaleFilterStatus = SaleStatus | "all";

export interface SalesFilters {
  search?: string;
  status?: SaleFilterStatus;
}

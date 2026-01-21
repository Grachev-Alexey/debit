import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Типы для работы с MySQL базой данных client_sales_tracker
// Эта схема отражает структуру существующей таблицы

export type SaleStatus = "active" | "overdue" | "underpaid" | "paid_off" | "completed";

export interface PaymentScheduleEntry {
  payment_number: number;
  planned_date: string;
  planned_amount: number;
  status?: "pending" | "paid" | "overdue";
  actual_date?: string;
  actual_amount?: number;
  difference?: number;
  discrepancy?: "overpaid" | "underpaid" | "exact";
  
  date?: string;
  amount?: number;
  description?: string;
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
  client_name: string | null;
  master_name: string | null;
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
  is_frozen: boolean;
  is_refund: boolean;
  summa_vozvrata: number | null;
  booked: boolean;
  date_booked: Date | null;
  comments: string | null;
  last_checked_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  pdf_url: string | null;
}

export const paymentScheduleEntrySchema = z.object({
  payment_number: z.number().int().positive(),
  planned_date: z.string(),
  planned_amount: z.number().nonnegative({ message: "Сумма платежа не может быть отрицательной" }),
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  actual_date: z.string().optional(),
  actual_amount: z.number().nonnegative().optional(),
  difference: z.number().optional(),
  discrepancy: z.enum(["overpaid", "underpaid", "exact"]).optional(),
  
  date: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  description: z.string().optional(),
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
  client_name: z.string().nullable().optional(),
  master_name: z.string().nullable().optional(),
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
  is_frozen: z.boolean().default(false),
  is_refund: z.boolean().default(false),
  summa_vozvrata: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? null : Number(val),
    z.number().nonnegative().nullable().optional()
  ),
  booked: z.boolean().default(false),
  date_booked: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  pdf_url: z.string().nullable().optional(),
});

// Схема для обновления продажи (id добавляется отдельно)
export const updateClientSaleSchema = insertClientSaleSchema.partial();

export type InsertClientSale = z.infer<typeof insertClientSaleSchema>;
export type UpdateClientSale = z.infer<typeof updateClientSaleSchema>;

// Типы для фильтрации
export type SaleFilterStatus = SaleStatus | "all";

export interface DateRange {
  from: string;
  to: string;
}

export type SortField = "purchase_date" | "next_payment_date" | "total_cost" | "client_name" | "master_name" | "status";
export type SortOrder = "asc" | "desc";

export interface SalesFilters {
  search?: string;
  clientName?: string;
  status?: SaleFilterStatus;
  companyId?: number;
  masterName?: string;
  purchaseDateRange?: DateRange;
  nextPaymentDateRange?: DateRange;
  isFrozen?: boolean;
  isRefund?: boolean;
  isBooked?: boolean;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface AnalyticsData {
  totalPlanned: number;
  totalActual: number;
  byCompany: {
    companyId: number;
    companyName: string;
    planned: number;
    actual: number;
    plannedPeople: number;
    actualPeople: number;
  }[];
  monthlyStats: {
    month: string;
    planned: number;
    actual: number;
    plannedPeople: number;
    actualPeople: number;
  }[];
}

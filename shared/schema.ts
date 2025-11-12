import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Типы для работы с MySQL базой данных client_sales_tracker
// Эта схема отражает структуру существующей таблицы

export interface ClientSale {
  id: number;
  sale_id: number;
  amocrm_lead_id: number;
  client_phone: string;
  subscription_title: string | null;
  purchase_date: Date;
  total_cost: number;
  is_installment: boolean;
  next_payment_date: Date | null;
  overdue_days: number;
  is_fully_paid: boolean;
  status: string;
}

// Схема для вставки новой продажи
export const insertClientSaleSchema = z.object({
  sale_id: z.coerce.number().int().positive({ message: "ID продажи обязателен" }),
  amocrm_lead_id: z.coerce.number().int().positive({ message: "ID сделки в AmoCRM обязателен" }),
  client_phone: z.string().min(1, { message: "Телефон клиента обязателен" }),
  subscription_title: z.string().nullable().optional(),
  purchase_date: z.string().min(1, { message: "Дата покупки обязательна" }),
  total_cost: z.coerce.number().positive({ message: "Общая стоимость должна быть положительной" }),
  is_installment: z.boolean().default(false),
  next_payment_date: z.string().nullable().optional(),
  is_fully_paid: z.boolean().default(false),
  status: z.enum(["active", "overdue", "paid"], { 
    message: "Статус должен быть: active, overdue или paid" 
  }).default("active"),
});

// Схема для обновления продажи (id добавляется отдельно)
export const updateClientSaleSchema = insertClientSaleSchema.partial();

export type InsertClientSale = z.infer<typeof insertClientSaleSchema>;
export type UpdateClientSale = z.infer<typeof updateClientSaleSchema>;

// Типы для фильтрации
export type SaleStatus = "active" | "overdue" | "paid" | "all";

export interface SalesFilters {
  search?: string;
  status?: SaleStatus;
}

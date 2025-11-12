import { type ClientSale, type InsertClientSale, type UpdateClientSale, type SalesFilters } from "@shared/schema";
import { pool } from "./database";
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// Интерфейс для работы с продажами клиентов
export interface IStorage {
  getSales(filters?: SalesFilters): Promise<ClientSale[]>;
  getSaleById(id: number): Promise<ClientSale | undefined>;
  createSale(sale: InsertClientSale): Promise<ClientSale>;
  updateSale(id: number, sale: UpdateClientSale): Promise<ClientSale | undefined>;
}

export class MySQLStorage implements IStorage {
  // Получить список продаж с фильтрацией и поиском
  async getSales(filters?: SalesFilters): Promise<ClientSale[]> {
    let query = 'SELECT * FROM client_sales_tracker WHERE 1=1';
    const params: any[] = [];

    // Фильтр по поиску (телефон или ID продажи)
    if (filters?.search) {
      query += ' AND (client_phone LIKE ? OR sale_id = ?)';
      params.push(`%${filters.search}%`);
      // Пытаемся преобразовать в число для поиска по ID
      const searchAsNumber = parseInt(filters.search);
      params.push(isNaN(searchAsNumber) ? null : searchAsNumber);
    }

    // Фильтр по статусу
    if (filters?.status && filters.status !== 'all') {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Сортировка по дате покупки (новые сначала)
    query += ' ORDER BY purchase_date DESC';

    try {
      const [rows] = await pool.execute<RowDataPacket[]>(query, params);
      return rows.map(row => this.mapRowToClientSale(row));
    } catch (error) {
      console.error('Ошибка при получении списка продаж:', error);
      throw new Error('Не удалось получить список продаж');
    }
  }

  // Получить продажу по ID (внутреннему)
  async getSaleById(id: number): Promise<ClientSale | undefined> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM client_sales_tracker WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return undefined;
      }
      
      return this.mapRowToClientSale(rows[0]);
    } catch (error) {
      console.error('Ошибка при получении продажи:', error);
      throw new Error('Не удалось получить данные продажи');
    }
  }

  // Создать новую продажу
  async createSale(sale: InsertClientSale): Promise<ClientSale> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO client_sales_tracker 
        (sale_id, amocrm_lead_id, client_phone, subscription_title, purchase_date, 
         total_cost, is_installment, next_payment_date, is_fully_paid, status, overdue_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          sale.sale_id,
          sale.amocrm_lead_id,
          sale.client_phone,
          sale.subscription_title || null,
          sale.purchase_date,
          sale.total_cost,
          sale.is_installment ? 1 : 0,
          sale.next_payment_date || null,
          sale.is_fully_paid ? 1 : 0,
          sale.status,
        ]
      );

      // Получаем созданную запись
      const createdSale = await this.getSaleById(result.insertId);
      if (!createdSale) {
        throw new Error('Не удалось получить созданную продажу');
      }

      return createdSale;
    } catch (error) {
      console.error('Ошибка при создании продажи:', error);
      throw new Error('Не удалось создать продажу');
    }
  }

  // Обновить существующую продажу
  async updateSale(id: number, sale: UpdateClientSale): Promise<ClientSale | undefined> {
    try {
      // Строим динамический запрос обновления только для переданных полей
      const updates: string[] = [];
      const params: any[] = [];

      if (sale.sale_id !== undefined) {
        updates.push('sale_id = ?');
        params.push(sale.sale_id);
      }
      if (sale.amocrm_lead_id !== undefined) {
        updates.push('amocrm_lead_id = ?');
        params.push(sale.amocrm_lead_id);
      }
      if (sale.client_phone !== undefined) {
        updates.push('client_phone = ?');
        params.push(sale.client_phone);
      }
      if (sale.subscription_title !== undefined) {
        updates.push('subscription_title = ?');
        params.push(sale.subscription_title || null);
      }
      if (sale.purchase_date !== undefined) {
        updates.push('purchase_date = ?');
        params.push(sale.purchase_date);
      }
      if (sale.total_cost !== undefined) {
        updates.push('total_cost = ?');
        params.push(sale.total_cost);
      }
      if (sale.is_installment !== undefined) {
        updates.push('is_installment = ?');
        params.push(sale.is_installment ? 1 : 0);
      }
      if (sale.next_payment_date !== undefined) {
        updates.push('next_payment_date = ?');
        params.push(sale.next_payment_date || null);
      }
      if (sale.is_fully_paid !== undefined) {
        updates.push('is_fully_paid = ?');
        params.push(sale.is_fully_paid ? 1 : 0);
      }
      if (sale.status !== undefined) {
        updates.push('status = ?');
        params.push(sale.status);
      }

      if (updates.length === 0) {
        // Нет полей для обновления
        return this.getSaleById(id);
      }

      params.push(id);

      await pool.execute(
        `UPDATE client_sales_tracker SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return this.getSaleById(id);
    } catch (error) {
      console.error('Ошибка при обновлении продажи:', error);
      throw new Error('Не удалось обновить продажу');
    }
  }

  // Вспомогательная функция для преобразования строки БД в объект ClientSale
  private mapRowToClientSale(row: RowDataPacket): ClientSale {
    return {
      id: row.id,
      sale_id: row.sale_id,
      amocrm_lead_id: row.amocrm_lead_id,
      client_phone: row.client_phone,
      subscription_title: row.subscription_title,
      purchase_date: new Date(row.purchase_date),
      total_cost: parseFloat(row.total_cost),
      is_installment: Boolean(row.is_installment),
      next_payment_date: row.next_payment_date ? new Date(row.next_payment_date) : null,
      overdue_days: row.overdue_days,
      is_fully_paid: Boolean(row.is_fully_paid),
      status: row.status,
    };
  }
}

export const storage = new MySQLStorage();

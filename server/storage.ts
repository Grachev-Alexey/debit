import { type ClientSale, type InsertClientSale, type UpdateClientSale, type SalesFilters, type AnalyticsData } from "@shared/schema";
import { STUDIOS } from "@shared/constants";
import { pool } from "./database";
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// Интерфейс для работы с продажами клиентов
export interface IStorage {
  getSales(filters?: SalesFilters): Promise<ClientSale[]>;
  getSaleById(id: number): Promise<ClientSale | undefined>;
  createSale(sale: InsertClientSale): Promise<ClientSale>;
  updateSale(id: number, sale: UpdateClientSale): Promise<ClientSale | undefined>;
  deleteSale(id: number): Promise<boolean>;
  getAnalytics(month?: number, year?: number): Promise<AnalyticsData>;
}

export class MySQLStorage implements IStorage {
  // Вычислить количество дней просрочки на основе графика платежей
  private calculateOverdueDays(paymentSchedule: any): number {
    if (!paymentSchedule || !Array.isArray(paymentSchedule) || paymentSchedule.length === 0) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Найти первый неоплаченный и просроченный платеж
    for (const payment of paymentSchedule) {
      if (payment.status !== 'paid') {
        const plannedDate = this.parseRussianDate(payment.planned_date);
        if (plannedDate && plannedDate < today) {
          const diffTime = today.getTime() - plannedDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        }
      }
    }

    return 0;
  }

  // Парсить дату в русском формате (DD.MM.YYYY) или ISO
  private parseRussianDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    // Если уже в формате ISO (YYYY-MM-DD)
    if (dateStr.includes('-')) {
      return new Date(dateStr);
    }

    // Парсинг русского формата DD.MM.YYYY
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // месяцы в JS начинаются с 0
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    return null;
  }

  // Получить список продаж с фильтрацией и поиском
  async getSales(filters?: SalesFilters): Promise<ClientSale[]> {
    let query = 'SELECT * FROM client_sales_tracker WHERE 1=1';
    const params: any[] = [];

    // Фильтр по поиску (телефон или ID продажи)
    if (filters?.search) {
      const searchAsNumber = parseInt(filters.search);
      if (!isNaN(searchAsNumber)) {
        // Если search это число, ищем по телефону или ID продажи
        query += ' AND (client_phone LIKE ? OR sale_id = ?)';
        params.push(`%${filters.search}%`);
        params.push(searchAsNumber);
      } else {
        // Если search не число, ищем только по телефону
        query += ' AND client_phone LIKE ?';
        params.push(`%${filters.search}%`);
      }
    }

    // Фильтр по статусу
    if (filters?.status && filters.status !== 'all') {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Фильтр по студии
    if (filters?.companyId) {
      query += ' AND yclients_company_id = ?';
      params.push(filters.companyId);
    }

    // Фильтр по имени клиента (поиск с LIKE)
    if (filters?.clientName) {
      query += ' AND client_name LIKE ?';
      params.push(`%${filters.clientName}%`);
    }

    // Фильтр по имени мастера (поиск с LIKE)
    if (filters?.masterName) {
      query += ' AND master_name LIKE ?';
      params.push(`%${filters.masterName}%`);
    }

    // Фильтр по диапазону дат покупки
    if (filters?.purchaseDateRange) {
      if (filters.purchaseDateRange.from) {
        query += ' AND purchase_date >= ?';
        params.push(filters.purchaseDateRange.from);
      }
      if (filters.purchaseDateRange.to) {
        query += ' AND purchase_date <= ?';
        params.push(filters.purchaseDateRange.to);
      }
    }

    // Фильтр по диапазону дат следующего платежа
    // Исключаем полностью оплаченных клиентов при фильтрации по дате следующего платежа
    if (filters?.nextPaymentDateRange) {
      query += ' AND is_fully_paid = FALSE';
      if (filters.nextPaymentDateRange.from) {
        query += ' AND next_payment_date >= ?';
        params.push(filters.nextPaymentDateRange.from);
      }
      if (filters.nextPaymentDateRange.to) {
        query += ' AND next_payment_date <= ?';
        params.push(filters.nextPaymentDateRange.to);
      }
    }

    // Фильтр по заморозке
    if (filters?.isFrozen !== undefined) {
      query += ' AND is_frozen = ?';
      params.push(filters.isFrozen ? 1 : 0);
    }

    // Фильтр по возврату
    if (filters?.isRefund !== undefined) {
      query += ' AND is_refund = ?';
      params.push(filters.isRefund ? 1 : 0);
    }

    // Фильтр по записи клиента
    if (filters?.isBooked !== undefined) {
      query += ' AND booked = ?';
      params.push(filters.isBooked ? 1 : 0);
    }

    // Сортировка с whitelist для безопасности
    const allowedSortFields = {
      'purchase_date': 'purchase_date',
      'next_payment_date': 'next_payment_date',
      'total_cost': 'total_cost',
      'client_name': 'client_name',
      'master_name': 'master_name',
      'status': 'status'
    };

    const sortField = filters?.sortBy && allowedSortFields[filters.sortBy] 
      ? allowedSortFields[filters.sortBy] 
      : 'purchase_date';
    
    const sortDirection = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;

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
      // Вычислить overdue_days для новой записи, если есть график платежей
      const overdueDays = sale.payment_schedule ? this.calculateOverdueDays(sale.payment_schedule) : 0;

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO client_sales_tracker 
        (sale_id, amocrm_lead_id, yclients_client_id, yclients_company_id, client_phone, client_name, master_name, subscription_title, purchase_date, 
         total_cost, is_installment, payment_schedule, payment_history, total_payments, payments_made_count, next_payment_date, next_payment_amount, 
         is_fully_paid, status, is_frozen, is_refund, comments, pdf_url, overdue_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.sale_id,
          sale.amocrm_lead_id,
          sale.yclients_client_id || null,
          sale.yclients_company_id || null,
          sale.client_phone,
          sale.client_name || null,
          sale.master_name || null,
          sale.subscription_title || null,
          sale.purchase_date,
          sale.total_cost,
          sale.is_installment ? 1 : 0,
          sale.payment_schedule ? JSON.stringify(sale.payment_schedule) : null,
          sale.payment_history ? JSON.stringify(sale.payment_history) : null,
          sale.total_payments || null,
          sale.payments_made_count || null,
          sale.next_payment_date || null,
          sale.next_payment_amount || null,
          sale.is_fully_paid ? 1 : 0,
          sale.status,
          sale.is_frozen ? 1 : 0,
          sale.is_refund ? 1 : 0,
          sale.comments || null,
          sale.pdf_url || null,
          overdueDays,
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
      if (sale.yclients_client_id !== undefined) {
        updates.push('yclients_client_id = ?');
        params.push(sale.yclients_client_id || null);
      }
      if (sale.yclients_company_id !== undefined) {
        updates.push('yclients_company_id = ?');
        params.push(sale.yclients_company_id || null);
      }
      if (sale.client_phone !== undefined) {
        updates.push('client_phone = ?');
        params.push(sale.client_phone);
      }
      if (sale.client_name !== undefined) {
        updates.push('client_name = ?');
        params.push(sale.client_name || null);
      }
      if (sale.master_name !== undefined) {
        updates.push('master_name = ?');
        params.push(sale.master_name || null);
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
      if (sale.payment_schedule !== undefined) {
        updates.push('payment_schedule = ?');
        params.push(sale.payment_schedule ? JSON.stringify(sale.payment_schedule) : null);
        
        // Вычислить overdue_days на основе нового графика платежей
        const overdueDays = this.calculateOverdueDays(sale.payment_schedule);
        updates.push('overdue_days = ?');
        params.push(overdueDays);
      }
      if (sale.payment_history !== undefined) {
        updates.push('payment_history = ?');
        params.push(sale.payment_history ? JSON.stringify(sale.payment_history) : null);
      }
      if (sale.total_payments !== undefined) {
        updates.push('total_payments = ?');
        params.push(sale.total_payments || null);
      }
      if (sale.payments_made_count !== undefined) {
        updates.push('payments_made_count = ?');
        params.push(sale.payments_made_count || null);
      }
      if (sale.next_payment_date !== undefined) {
        updates.push('next_payment_date = ?');
        params.push(sale.next_payment_date || null);
      }
      if (sale.next_payment_amount !== undefined) {
        updates.push('next_payment_amount = ?');
        params.push(sale.next_payment_amount || null);
      }
      if (sale.is_fully_paid !== undefined) {
        updates.push('is_fully_paid = ?');
        params.push(sale.is_fully_paid ? 1 : 0);
      }
      if (sale.status !== undefined) {
        updates.push('status = ?');
        params.push(sale.status);
      }
      if (sale.is_frozen !== undefined) {
        updates.push('is_frozen = ?');
        params.push(sale.is_frozen ? 1 : 0);
      }
      if (sale.is_refund !== undefined) {
        updates.push('is_refund = ?');
        params.push(sale.is_refund ? 1 : 0);
      }
      if (sale.comments !== undefined) {
        updates.push('comments = ?');
        params.push(sale.comments || null);
      }
      if (sale.pdf_url !== undefined) {
        updates.push('pdf_url = ?');
        params.push(sale.pdf_url || null);
      }
      if (sale.booked !== undefined) {
        updates.push('booked = ?');
        params.push(sale.booked ? 1 : 0);
      }
      if (sale.date_booked !== undefined) {
        updates.push('date_booked = ?');
        params.push(sale.date_booked || null);
      }
      if (sale.summa_vozvrata !== undefined) {
        updates.push('summa_vozvrata = ?');
        params.push(sale.summa_vozvrata || null);
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

  // Удалить продажу по ID
  async deleteSale(id: number): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM client_sales_tracker WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Ошибка при удалении продажи:', error);
      throw new Error('Не удалось удалить продажу');
    }
  }

  async getAnalytics(month?: number, year?: number): Promise<AnalyticsData> {
    const sales = await this.getSales();
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;
    const targetYear = year !== undefined ? year : now.getFullYear();

    let totalPlanned = 0;
    let totalActual = 0;
    const companyStats: Record<number, { name: string; planned: number; actual: number; plannedPeople: Set<number>; actualPeople: Set<number> }> = {};
    const monthlyStats: Record<string, { planned: number; actual: number; plannedPeople: Set<number>; actualPeople: Set<number> }> = {};

    sales.forEach(sale => {
      // Пропускаем продажи с возвратом для основного дохода, если нужно
      // Но клиент просил "учитываются ли возвраты", обычно в аналитике их вычитают или помечают
      // Для простоты пока считаем все платежи, но можем добавить фильтр

      if (sale.payment_schedule) {
        sale.payment_schedule.forEach(p => {
          const plannedDate = this.parseRussianDate(p.planned_date);
          const actualDate = p.actual_date ? this.parseRussianDate(p.actual_date) : null;

          // ПЛАНОВЫЕ показатели считаем по ПЛАНОВОЙ дате
          if (plannedDate) {
            const pMonth = plannedDate.getMonth() + 1;
            const pYear = plannedDate.getFullYear();
            const monthKey = `${pYear}-${String(pMonth).padStart(2, '0')}`;

            if (!monthlyStats[monthKey]) {
              monthlyStats[monthKey] = { planned: 0, actual: 0, plannedPeople: new Set(), actualPeople: new Set() };
            }

            const plannedAmount = p.planned_amount || 0;
            monthlyStats[monthKey].planned += plannedAmount;
            monthlyStats[monthKey].plannedPeople.add(sale.id);

            if (pMonth === targetMonth && pYear === targetYear) {
              totalPlanned += plannedAmount;
              const cId = sale.yclients_company_id || 0;
              if (!companyStats[cId]) {
                const studio = STUDIOS.find(s => s.id === cId);
                companyStats[cId] = { 
                  name: studio ? studio.name : `Филиал ${cId || 'Неизвестно'}`, 
                  planned: 0, 
                  actual: 0,
                  plannedPeople: new Set(),
                  actualPeople: new Set()
                };
              }
              companyStats[cId].planned += plannedAmount;
              companyStats[cId].plannedPeople.add(sale.id);
            }
          }

          // ФАКТИЧЕСКИЕ показатели считаем по ФАКТИЧЕСКОЙ дате
          if (actualDate && p.status === 'paid') {
            const aMonth = actualDate.getMonth() + 1;
            const aYear = actualDate.getFullYear();
            const monthKey = `${aYear}-${String(aMonth).padStart(2, '0')}`;

            if (!monthlyStats[monthKey]) {
              monthlyStats[monthKey] = { planned: 0, actual: 0, plannedPeople: new Set(), actualPeople: new Set() };
            }

            const actualAmount = p.actual_amount || 0;
            monthlyStats[monthKey].actual += actualAmount;
            monthlyStats[monthKey].actualPeople.add(sale.id);

            if (aMonth === targetMonth && aYear === targetYear) {
              totalActual += actualAmount;
              const cId = sale.yclients_company_id || 0;
              if (!companyStats[cId]) {
                const studio = STUDIOS.find(s => s.id === cId);
                companyStats[cId] = { 
                  name: studio ? studio.name : `Филиал ${cId || 'Неизвестно'}`, 
                  planned: 0, 
                  actual: 0,
                  plannedPeople: new Set(),
                  actualPeople: new Set()
                };
              }
              companyStats[cId].actual += actualAmount;
              companyStats[cId].actualPeople.add(sale.id);
            }
          }
        });
      }
    });

    return {
      totalPlanned,
      totalActual,
      byCompany: Object.entries(companyStats).map(([id, stats]) => ({
        companyId: Number(id),
        companyName: stats.name,
        planned: stats.planned,
        actual: stats.actual,
        plannedPeople: stats.plannedPeople.size,
        actualPeople: stats.actualPeople.size
      })),
      monthlyStats: Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => ({
          month,
          planned: stats.planned,
          actual: stats.actual,
          plannedPeople: stats.plannedPeople.size,
          actualPeople: stats.actualPeople.size
        }))
    };
  }

  // Вспомогательная функция для преобразования строки БД в объект ClientSale
  private mapRowToClientSale(row: RowDataPacket): ClientSale {
    let paymentSchedule = null;
    let paymentHistory = null;

    try {
      paymentSchedule = row.payment_schedule ? 
        (typeof row.payment_schedule === 'string' ? JSON.parse(row.payment_schedule) : row.payment_schedule) : null;
    } catch (error) {
      console.error('Ошибка парсинга payment_schedule:', error);
      paymentSchedule = null;
    }

    try {
      paymentHistory = row.payment_history ? 
        (typeof row.payment_history === 'string' ? JSON.parse(row.payment_history) : row.payment_history) : null;
    } catch (error) {
      console.error('Ошибка парсинга payment_history:', error);
      paymentHistory = null;
    }

    return {
      id: row.id,
      sale_id: row.sale_id,
      amocrm_lead_id: row.amocrm_lead_id,
      yclients_client_id: row.yclients_client_id || null,
      yclients_company_id: row.yclients_company_id || null,
      client_phone: row.client_phone,
      client_name: row.client_name || null,
      master_name: row.master_name || null,
      subscription_title: row.subscription_title,
      purchase_date: new Date(row.purchase_date),
      total_cost: parseFloat(row.total_cost),
      is_installment: Boolean(row.is_installment),
      payment_schedule: paymentSchedule,
      payment_history: paymentHistory,
      total_payments: row.total_payments || null,
      payments_made_count: row.payments_made_count || null,
      next_payment_date: row.next_payment_date ? new Date(row.next_payment_date) : null,
      next_payment_amount: row.next_payment_amount ? parseFloat(row.next_payment_amount) : null,
      overdue_days: row.overdue_days || 0,
      is_fully_paid: Boolean(row.is_fully_paid),
      status: row.status,
      is_underpaid: Boolean(row.is_underpaid),
      underpayment_amount: parseFloat(row.underpayment_amount || '0'),
      is_frozen: Boolean(row.is_frozen),
      is_refund: Boolean(row.is_refund),
      comments: row.comments || null,
      last_checked_at: row.last_checked_at ? new Date(row.last_checked_at) : null,
      created_at: row.created_at ? new Date(row.created_at) : null,
      updated_at: row.updated_at ? new Date(row.updated_at) : null,
      pdf_url: row.pdf_url || null,
      booked: Boolean(row.booked),
      date_booked: row.date_booked ? new Date(row.date_booked) : null,
      summa_vozvrata: row.summa_vozvrata ? parseFloat(row.summa_vozvrata) : null,
    };
  }
}

export const storage = new MySQLStorage();

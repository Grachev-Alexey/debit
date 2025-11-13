import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSaleSchema, updateClientSaleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/sales - Получить список продаж с фильтрацией и поиском
  app.get("/api/sales", async (req, res) => {
    try {
      const { 
        search, 
        status, 
        companyId, 
        masterName,
        purchaseDateFrom,
        purchaseDateTo,
        nextPaymentDateFrom,
        nextPaymentDateTo
      } = req.query;

      const filters = {
        search: search ? String(search) : undefined,
        status: status ? String(status) as any : undefined,
        companyId: companyId ? Number(companyId) : undefined,
        masterName: masterName ? String(masterName) : undefined,
        purchaseDateRange: (purchaseDateFrom || purchaseDateTo) ? {
          from: purchaseDateFrom ? String(purchaseDateFrom) : '',
          to: purchaseDateTo ? String(purchaseDateTo) : '',
        } : undefined,
        nextPaymentDateRange: (nextPaymentDateFrom || nextPaymentDateTo) ? {
          from: nextPaymentDateFrom ? String(nextPaymentDateFrom) : '',
          to: nextPaymentDateTo ? String(nextPaymentDateTo) : '',
        } : undefined,
      };

      const sales = await storage.getSales(filters);
      res.json(sales);
    } catch (error) {
      console.error("Ошибка при получении списка продаж:", error);
      res.status(500).json({ 
        error: "Не удалось получить список продаж",
        message: error instanceof Error ? error.message : "Неизвестная ошибка"
      });
    }
  });

  // GET /api/sales/:id - Получить одну продажу по ID
  app.get("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Неверный ID продажи" });
      }

      const sale = await storage.getSaleById(id);
      if (!sale) {
        return res.status(404).json({ error: "Продажа не найдена" });
      }

      res.json(sale);
    } catch (error) {
      console.error("Ошибка при получении продажи:", error);
      res.status(500).json({ 
        error: "Не удалось получить данные продажи",
        message: error instanceof Error ? error.message : "Неизвестная ошибка"
      });
    }
  });

  // POST /api/sales - Создать новую продажу
  app.post("/api/sales", async (req, res) => {
    try {
      // Валидация данных с помощью Zod
      const validatedData = insertClientSaleSchema.parse(req.body);

      const newSale = await storage.createSale(validatedData);
      res.status(201).json(newSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Ошибка валидации данных",
          details: error.errors 
        });
      }

      console.error("Ошибка при создании продажи:", error);
      res.status(500).json({ 
        error: "Не удалось создать продажу",
        message: error instanceof Error ? error.message : "Неизвестная ошибка"
      });
    }
  });

  // PATCH /api/sales/:id - Обновить существующую продажу
  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Неверный ID продажи" });
      }

      // Валидация данных с помощью Zod (partial schema)
      const validatedData = updateClientSaleSchema.parse(req.body);

      const updatedSale = await storage.updateSale(id, validatedData);
      if (!updatedSale) {
        return res.status(404).json({ error: "Продажа не найдена" });
      }

      res.json(updatedSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Ошибка валидации данных",
          details: error.errors 
        });
      }

      console.error("Ошибка при обновлении продажи:", error);
      res.status(500).json({ 
        error: "Не удалось обновить продажу",
        message: error instanceof Error ? error.message : "Неизвестная ошибка"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

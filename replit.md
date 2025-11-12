# Дебиторка (Контроль абонементов клиентов)

## Overview

This is a full-stack web application for managing client subscription payments and tracking. The system is designed as an admin panel ("Дебиторка") that allows tracking subscription records, monitoring payment statuses, handling installment plans, and managing overdue payments for client subscriptions. The application features a clean, professional interface following Material Design principles with Linear-inspired aesthetics.

## User Preferences

Preferred communication style: Simple, everyday language.

**ВАЖНО: База данных**
- Используется ТОЛЬКО MySQL - существующая база данных пользователя
- PostgreSQL НЕ используется
- Подключение через переменные окружения: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing (instead of React Router)
- Single-page application (SPA) architecture with the root component in `client/src/App.tsx`

**UI Component System**
- **shadcn/ui** component library built on Radix UI primitives (New York style variant)
- **Tailwind CSS** for utility-first styling with custom design tokens
- Design system follows spacing units of 2, 4, 6, 8, 12, 16 for consistent layouts
- Custom color scheme with HSL-based CSS variables supporting light/dark modes
- Typography uses Inter font family from Google Fonts
- Comprehensive set of pre-built components (40+ UI components including dialogs, tables, forms, badges, etc.)

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management, caching, and data synchronization
- Custom query client configuration with automatic error handling and refetch behavior
- Form state managed with **React Hook Form** and **Zod** schema validation
- Toast notifications for user feedback using custom hook-based system

**Key Frontend Features**
- Sales listing with search and filter capabilities (by phone number, sale ID, and status)
- Modal-based forms for creating and editing sales records
- Real-time data updates using React Query's invalidation patterns
- Responsive table design with status badges and action buttons
- Date and currency formatters for Russian locale (ru-RU)

### Backend Architecture

**Server Framework**
- **Express.js** running on Node.js with TypeScript
- ESM module system throughout the codebase
- Development mode uses `tsx` for TypeScript execution
- Production build uses `esbuild` for fast bundling

**API Design**
- RESTful API endpoints under `/api` prefix
- Routes defined in `server/routes.ts`:
  - `GET /api/sales` - List sales with optional search and status filters
  - `GET /api/sales/:id` - Get single sale by ID
  - Additional CRUD endpoints for creating and updating sales
- JSON request/response format with error handling middleware
- Request logging middleware for API calls with duration tracking

**Database Layer**
- **MySQL only** - Uses existing user's MySQL database
- MySQL configuration in `server/database.ts` with connection pooling via `mysql2/promise`
- Database abstraction through storage interface pattern (`IStorage` in `server/storage.ts`)
- Connection credentials stored securely in Replit Secrets
- Schema includes fields for: sale_id, amocrm_lead_id, client_phone, subscription_title, purchase_date, total_cost, installment tracking, payment status, and overdue calculations

**Data Validation**
- Shared schema definitions using **Zod** in `shared/schema.ts`
- Type-safe data transfer objects (DTOs) with `insertClientSaleSchema` and `updateClientSaleSchema`
- Automatic validation of API inputs using Zod resolvers

### Database Schema

**Main Entity: client_sales_tracker**
- `id` - Internal primary key (auto-increment)
- `sale_id` - External sale identifier (displayed to users)
- `amocrm_lead_id` - Integration identifier for AmoCRM
- `client_phone` - Customer phone number (searchable)
- `subscription_title` - Product/service name (nullable)
- `purchase_date` - Transaction date
- `total_cost` - Total amount in rubles
- `is_installment` - Boolean flag for installment plans
- `next_payment_date` - Upcoming payment due date (nullable)
- `overdue_days` - Calculated field for payment delays
- `is_fully_paid` - Payment completion status
- `status` - Enum: "active", "overdue", "paid"

**Status Management**
- Three primary states: active (ongoing payments), overdue (missed deadlines), paid (completed)
- Overdue days tracked as integer field for reporting
- Status filtering available in UI and API

### External Dependencies

**Third-Party Services**
- **AmoCRM Integration** - References to `amocrm_lead_id` suggest integration with AmoCRM CRM system for lead management

**Database Providers**
- **MySQL only** - User's existing MySQL database with connection pooling via `mysql2/promise`
- Credentials managed through Replit Secrets (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)

**Development Tools**
- **Replit-specific plugins** for development environment (runtime error overlay, cartographer, dev banner)
- **Google Fonts CDN** for Inter font family
- **Drizzle Kit** for database migrations and schema management

**Build & Development Dependencies**
- TypeScript compiler with strict mode enabled
- PostCSS with Tailwind CSS and Autoprefixer
- ESBuild for production bundling
- Path aliases configured for cleaner imports (@/, @shared/, @assets/)
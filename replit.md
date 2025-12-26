# Client Sales Tracker (Дебиторка)

A full-stack client sales and payment tracking application built with React, Express, and MySQL.

## Overview

This application manages client sales, payment schedules, and tracks receivables. It provides filtering, searching, and status tracking for sales records.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI components
- **Backend**: Express.js, Node.js
- **Database**: MySQL (external)
- **State Management**: TanStack Query (React Query)

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and helpers
│   │   └── pages/       # Page components
│   └── public/      # Static assets
├── server/          # Express backend
│   ├── index.ts     # Main server entry
│   ├── routes.ts    # API routes
│   ├── database.ts  # MySQL connection
│   ├── storage.ts   # Data storage layer
│   └── vite.ts      # Vite dev server setup
└── shared/          # Shared types and schemas
    ├── schema.ts    # Zod schemas and types
    └── constants.ts # Shared constants
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

## Environment Variables

The application requires the following MySQL environment variables:
- `MYSQL_HOST` - Database host
- `MYSQL_PORT` - Database port (default: 3306)
- `MYSQL_USER` - Database user
- `MYSQL_PASSWORD` - Database password
- `MYSQL_DATABASE` - Database name

## Development

The development server runs on port 5000 and serves both the API and the frontend. Vite is used in middleware mode for hot module replacement during development.

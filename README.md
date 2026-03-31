# ComplyOS

ComplyOS is a compliance management system focused on South African business regulations. It centralizes statutory obligations (CIPC, SARS, B-BBEE) into a structured dashboard for tracking, submission planning, and document storage.

The system is built as a single-page application using React and Firebase, with real-time synchronization and rule-based compliance logic.

---

## Purpose

Most SMEs manage compliance using disconnected tools, spreadsheets, or manual tracking. ComplyOS consolidates this into one system with:

- Structured compliance lifecycle per business entity
- Real-time status updates
- Centralized document storage
- Deterministic regulatory rules per entity type and sector

The system is designed around predictable rules, not user-defined workflows.

---

## Tech Stack

### Frontend
- React (Vite)
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- Firebase Authentication
- Firestore (real-time database)
- Firebase Storage
- Firebase Security Rules

### Tooling
- Vite
- TypeScript compiler
- Environment variables via `.env`

---

## Architecture

### Data Model

The core entities are:

- Business Profile
- Compliance Items
- Submission Records
- Document Vault

Firestore is the single source of truth. UI state is derived directly from real-time listeners.

---

### Compliance Logic

Compliance rules are defined in static mappings and enforced client-side with Firestore persistence:

- Submission cycles: monthly / quarterly / annual
- Entity types: PTY, NPC, Sole Proprietor
- Sector-based obligations
- Deadline tracking and status computation

---

### System Flow

1. User creates or logs into a business profile
2. System generates compliance roadmap based on metadata
3. Firestore stores obligations and schedules
4. Real-time listeners update dashboard state
5. Document uploads are linked to compliance items

---

## Project Structure

```text
src/
├── components/     Reusable UI components
├── lib/            Firebase setup and utilities
├── pages/          Route-level screens
├── types/          TypeScript definitions
├── constants/      Compliance rules and mappings
├── App.tsx         Root component
├── main.tsx        Entry point
├── index.css       Global styles
└── vite-env.d.ts   Vite types
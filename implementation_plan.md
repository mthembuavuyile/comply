# Upgrade ComplyOS: Accountant Toolkit + B-BBEE Platform

Transform ComplyOS from a single-user compliance reminder into a **multi-client practice management tool** for accountants and a **B-BBEE verification platform** with a differentiated supplier network.

## User Review Required

> [!IMPORTANT]
> **Data Model Change**: The current `businesses/{userId}` (1:1) model will be replaced with a multi-business model where users can own/access multiple client businesses. Existing users who already onboarded will need a data migration path. The plan handles this with backward-compatible reads, but existing single-business users will be auto-migrated to the new model on their next login.

> [!WARNING]
> **Landing Page Rewrite**: The landing page will be completely rewritten to target **accountants, auditors, and compliance professionals** as the primary buyer, with B-BBEE as the hero feature — not generic compliance reminders. The old SME-owner messaging will be removed.

> [!IMPORTANT]
> **Scope**: This is a large change (~15 files modified/created). The plan preserves all existing B-BBEE features (scorecard engine, supplier CRM, spend tracker, evidence vault, AI copilot) and wraps them with multi-client infrastructure. No existing features are deleted.

## Open Questions

> [!IMPORTANT]
> **Pricing tiers**: The landing page will include a pricing section. Should I use placeholder tiers (e.g., Starter R499/mo, Professional R1,499/mo, Enterprise R4,999/mo) or do you have specific pricing in mind?

> [!IMPORTANT]
> **Invitation flow**: For the team/accountant multi-client model, should we implement a full invite-by-email system now (requires Firebase Cloud Functions), or start with a simpler "add client" flow where the accountant creates client profiles themselves? **Recommendation**: Start with accountant-created client profiles (no email invitations needed), which keeps everything client-side.

---

## Proposed Changes

### 1. Data Model — Multi-Client Architecture

The core architectural change. Decouple businesses from users to enable one accountant to manage many clients.

---

#### [MODIFY] [types.ts](file:///c:/Users/mthem/Dev/Comply/src/types.ts)

Add new types for the multi-client model:

```typescript
// New: User role within the platform
export type UserRole = 'owner' | 'accountant' | 'auditor' | 'viewer';

// New: Firm/Practice profile for accountants
export interface Firm {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

// New: Access control — maps users to businesses they can manage
export interface BusinessAccess {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  grantedAt: Timestamp;
}

// MODIFY Business: add optional firmId, remove 1:1 userId coupling
// Business.id will now be auto-generated (not userId)
// Business.ownerId stays (the accountant who created it)
```

Update the `Business` interface to support firm-linked clients and add fields for richer B-BBEE data:
- `firmId?: string` — links to the managing firm
- `contactEmail?: string` — client's contact email  
- `contactPhone?: string` — client's phone
- `registrationNumber?: string` — CIPC registration number
- `vatNumber?: string` — SARS VAT number
- `financialYearEnd?: number` — month (1-12) of financial year end

---

#### [NEW] [src/lib/clientContext.tsx](file:///c:/Users/mthem/Dev/Comply/src/lib/clientContext.tsx)

A new React context that manages:
- **Active client selection** — which business the user is currently viewing
- **Client list** — all businesses the logged-in user has access to
- **Client switcher** — function to switch between clients

This replaces the current pattern where `business` is fetched once from `businesses/{userId}`. Instead:
1. On login, fetch all businesses where `ownerId == user.uid`
2. Store the list in context
3. Track `activeClientId` in state (persisted to localStorage)
4. All downstream pages read from `useClient()` instead of `useAuth().business`

---

#### [MODIFY] [src/App.tsx](file:///c:/Users/mthem/Dev/Comply/src/App.tsx)

- Wrap the app in the new `ClientProvider` 
- Update `AuthProvider` to remove the single-business fetch logic
- Update `ProtectedRoute` to check if the user has at least one business (or redirect to onboarding)
- Add new route: `/clients` — the client portfolio page

---

### 2. Client Management — Portfolio View

The accountant's primary workspace. See all clients at a glance.

---

#### [NEW] [src/pages/ClientsPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/ClientsPage.tsx)

**The portfolio dashboard for accountants.** Displays:

- **Client cards grid** — each card shows:
  - Business name, sector, province
  - B-BBEE level badge (computed live via scorecard engine)
  - Key risk indicators (expired certificates, spend gaps)
  - Last activity timestamp
  - Quick-action buttons (view dashboard, edit, scorecard)
- **Add Client button** → opens a streamlined onboarding modal (not a full page redirect)
- **Search & filter** — by sector, province, B-BBEE level, risk status
- **Portfolio summary stats bar**:
  - Total clients managed
  - Clients at risk (expired certs, low scores)
  - Average B-BBEE level across portfolio
  - Total procurement spend under management

---

#### [MODIFY] [src/pages/OnboardingPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/OnboardingPage.tsx)

Refactor to serve dual purposes:
1. **First-time user onboarding** — same flow as today, but saves to the new data model
2. **Add client modal** — reusable as a modal component (extracted from the page) so accountants can add new clients without a full-page redirect

Changes:
- Extract the 3-step form into a reusable `OnboardingForm` component
- The form writes to `businesses/{autoId}` (not `businesses/{userId}`)
- Sets `ownerId` to the current user's UID
- On completion, navigates to the new client's dashboard

---

### 3. Layout & Navigation — Client Switcher

---

#### [MODIFY] [src/components/Layout.tsx](file:///c:/Users/mthem/Dev/Comply/src/components/Layout.tsx)

Major upgrade to the sidebar:

1. **Client Switcher dropdown** at the top of the sidebar:
   - Shows the active client name + sector badge
   - Click to open a dropdown listing all clients
   - Search within the dropdown
   - "Add New Client" button at the bottom
   - "View All Clients" link to the portfolio page

2. **Navigation restructure**:
   - **B-BBEE section** (primary, above fold):
     - Dashboard (B-BBEE Health)
     - Scorecard Calculator
     - Suppliers CRM
     - Spend Tracker
     - Evidence Vault
     - Audit Projects
   - **Tools section**:
     - AI BEE Copilot
     - Alerts
   - **Practice section** (new):
     - All Clients (portfolio view)
     - Settings

3. **Branding update**: "ComplyOS" instead of "Vylex Comply"

---

### 4. Dashboard — B-BBEE Focused Command Center

---

#### [MODIFY] [src/pages/DashboardPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/DashboardPage.tsx)

Update all Firestore queries to scope by `activeClientId` instead of `user.uid`:
- `where("userId", "==", user.uid)` → `where("businessId", "==", activeClientId)`
- The `useClient()` hook provides the active business data

The dashboard is already B-BBEE focused (scorecard wheel, element progress bars, risk alerts, audit pipeline). Keep all of this. Add:
- **Client info header** — show which client is being viewed, with a "switch client" affordance
- **Export Report button** — generate a PDF-ready summary of the client's B-BBEE position (HTML print view for now)

---

### 5. All Data Pages — Scope to Active Client

Every page that queries Firestore needs to scope to the active client.

---

#### [MODIFY] [src/pages/SuppliersPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/SuppliersPage.tsx)
#### [MODIFY] [src/pages/SpendTrackerPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/SpendTrackerPage.tsx)
#### [MODIFY] [src/pages/ScorecardProjectsPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/ScorecardProjectsPage.tsx)
#### [MODIFY] [src/pages/ScorecardCalculatorPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/ScorecardCalculatorPage.tsx)
#### [MODIFY] [src/pages/DocumentsPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/DocumentsPage.tsx)
#### [MODIFY] [src/pages/AlertsPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/AlertsPage.tsx)
#### [MODIFY] [src/pages/AIAssistantPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/AIAssistantPage.tsx)

For each page, the pattern is identical:
1. Import `useClient()` instead of (or in addition to) `useAuth()`
2. Replace `user.uid` in Firestore queries with `activeClient.id`
3. Replace `userId: user.uid` in document writes with `userId: user.uid, businessId: activeClient.id`
4. Show a "No client selected" state if no active client

---

### 6. Landing Page — Complete Rewrite

---

#### [MODIFY] [src/pages/LandingPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/LandingPage.tsx)

**Complete rewrite** targeting accountants and B-BBEE professionals. New structure:

1. **Nav**: ComplyOS branding, links to Features / Pricing / Login
2. **Hero**: 
   - Headline: *"The B-BBEE platform your practice needs."*
   - Sub: *"Manage scorecard preparation, supplier verification, and audit evidence for every client — from one dashboard."*
   - CTA: "Start Free Trial" + "See How It Works"
   - Hero visual: Multi-client portfolio dashboard mockup (not single-business)

3. **Trust bar**: "Trusted by 50+ accounting practices across South Africa" (aspirational)

4. **Features grid** (3 columns):
   - **Multi-Client Portfolio**: Manage 100+ clients from one login
   - **Live Scorecard Engine**: Real-time B-BBEE points across all 5 elements
   - **Supplier Certificate Vault**: AI-powered OCR + expiry tracking
   - **Spend Gap Intelligence**: Automated skills, ED, SD, SED target tracking
   - **Audit-Ready Evidence**: One-click evidence pack generation
   - **AI BEE Copilot**: Natural language queries about any client's position

5. **Pricing section** (3 tiers):
   - Starter (up to 5 clients)
   - Professional (up to 50 clients)  
   - Enterprise (unlimited + API access)

6. **CTA banner**: "Stop managing B-BBEE with spreadsheets."

7. **Footer**: ComplyOS by Vylex Technology Group

---

### 7. Firestore Rules — Multi-Client Access

---

#### [MODIFY] [firestore.rules](file:///c:/Users/mthem/Dev/Comply/firestore.rules)

Update rules to support multi-client access:
- Business documents: readable/writable by `ownerId` match
- Compliance items, suppliers, spend logs, evidence: readable/writable if the user owns the parent business (`businessId` must match a business they own)
- This is enforced via the existing `ownerId` field on businesses

The key change: instead of `request.auth.uid == userId` on `/businesses/{userId}`, we check `request.auth.uid == resource.data.ownerId` on `/businesses/{businessId}`.

---

### 8. Settings Page — Practice Profile

---

#### [MODIFY] [src/pages/SettingsPage.tsx](file:///c:/Users/mthem/Dev/Comply/src/pages/SettingsPage.tsx)

Add a "Practice Profile" section:
- Firm name
- Number of team members (display only for now)
- API key management (Gemini)
- Account deletion

The "Business Profile" tab becomes client-specific (edit the active client's details).

---

## Verification Plan

### Automated Tests
- `npm run lint` — TypeScript compilation check across all modified files
- `npm run build` — Production build to verify no broken imports or dead code

### Manual Verification
1. **New user flow**: Sign up → onboarding → creates first client → lands on dashboard
2. **Add second client**: From sidebar client switcher → "Add Client" → onboarding form → switch between clients
3. **Client portfolio**: Navigate to /clients → see all clients with B-BBEE levels → search/filter
4. **Data isolation**: Add supplier to Client A → switch to Client B → verify supplier doesn't appear
5. **Dashboard scoping**: Each client's dashboard shows only their data
6. **Landing page**: Visual review of new copy, pricing, and responsive design
7. **Backward compatibility**: Existing users with data under `businesses/{userId}` are auto-migrated

---

## Implementation Order

| Phase | Files | Est. Scope |
|-------|-------|-----------|
| 1. Data model | `types.ts`, `clientContext.tsx` | Foundation — everything depends on this |
| 2. Auth + routing | `App.tsx` | Wire up new context + routes |
| 3. Layout + nav | `Layout.tsx` | Client switcher in sidebar |
| 4. Client portfolio | `ClientsPage.tsx` | New page — the accountant's home |
| 5. Onboarding refactor | `OnboardingPage.tsx` | Support add-client modal |
| 6. Data page scoping | All 7 data pages | Systematic find-and-replace |
| 7. Firestore rules | `firestore.rules` | Security model update |
| 8. Landing page | `LandingPage.tsx` | Complete rewrite |
| 9. Settings | `SettingsPage.tsx` | Practice profile |
| 10. Verify | Build + manual test | Ensure nothing breaks |

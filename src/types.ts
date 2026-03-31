import { Timestamp } from "firebase/firestore";

// --- Industry Sectors ---
// Core / General
// Professional Services
// Regulated & Specialized
// + catch-all "other"
export type Sector =
  // Core / General
  | 'general'
  | 'retail'
  | 'food_hospitality'
  | 'construction'
  | 'manufacturing'
  | 'transport_logistics'
  // Professional Services
  | 'legal'
  | 'accounting_financial'
  | 'medical'
  | 'pharmacy'
  | 'engineering_architecture'
  | 'it_technology'
  // Regulated & Specialized
  | 'real_estate'
  | 'insurance'
  | 'investment_asset_management'
  | 'education'
  | 'npo_npc'
  | 'agriculture'
  | 'mining'
  | 'security_services'
  | 'cleaning_facilities'
  // Catch-all
  | 'other';

export type BusinessStructure = 'sole_proprietor' | 'pty_ltd' | 'cc' | 'partnership' | 'npo';

export type VatStatus = 'yes' | 'no' | 'not_sure';

export type EmployeeBand = '0' | '1-5' | '6-20' | '21-50' | '51+';

export interface Business {
  id: string;
  businessName: string;
  sector: Sector;
  customSectorText?: string;        // Free text for "other" sector
  province: string;
  vatRegistered: VatStatus;
  employeeBand: EmployeeBand;
  businessStructure: BusinessStructure;
  cipcRegistered: boolean;
  onboardingCompleted: boolean;
  createdAt: Timestamp;
  ownerId: string;
  // Legacy field — kept for backward compat, no longer written
  employeeCount?: number;
}

export type ComplianceGroup =
  | 'tax_revenue'
  | 'company_secretarial'
  | 'labour_employment'
  | 'sector_specific'
  | 'licensing';

export type ComplianceCategory =
  | 'cipc_annual_return'
  | 'cipc_beneficial_ownership'
  | 'sars_tcs'
  | 'sars_provisional_tax'
  | 'turnover_tax'
  | 'uif'
  | 'coida'
  | 'bbbee'
  | 'municipal_licence'
  | 'popia'
  | 'paia'
  | 'fica'
  | 'fidelity_fund'
  | 'cpd'
  | 'trust_account'
  // New sector-specific categories
  | 'hpcsa_registration'
  | 'medical_waste'
  | 'fsca_licence'
  | 'cybersecurity_plan'
  | 'nhbrc_registration'
  | 'eaab_registration'
  | 'psira_registration'
  | 'sapc_registration'
  | 'ecsa_registration'
  | 'fic_registration';

export type ComplianceStatus = 'compliant' | 'pending_setup' | 'action_required' | 'expiring_soon' | 'overdue';

export interface ComplianceItem {
  id: string;
  userId: string;
  businessId: string;
  category: ComplianceCategory;
  complianceGroup: ComplianceGroup;
  title: string;
  description: string;
  legalReference: string;
  status: ComplianceStatus;
  dueDate: Timestamp | null;
  expiryDate: Timestamp | null;
  evidenceUrls: string[];
  notes: string;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Alert {
  id: string;
  userId: string;
  complianceItemId: string;
  type: 'due_soon' | 'overdue' | 'expiring';
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

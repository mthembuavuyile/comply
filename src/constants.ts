import { ComplianceCategory, ComplianceGroup, Sector, BusinessStructure, EmployeeBand } from "./types";

// --- Sector Display Config ---
export interface SectorOption {
  value: Sector;
  label: string;
  group: 'core' | 'professional' | 'regulated';
}

export const SECTOR_OPTIONS: SectorOption[] = [
  // Core / General
  { value: 'general', label: 'General Business', group: 'core' },
  { value: 'retail', label: 'Retail & Wholesale', group: 'core' },
  { value: 'food_hospitality', label: 'Food & Beverage / Hospitality', group: 'core' },
  { value: 'construction', label: 'Construction & Trades', group: 'core' },
  { value: 'manufacturing', label: 'Manufacturing & Production', group: 'core' },
  { value: 'transport_logistics', label: 'Transport & Logistics', group: 'core' },
  // Professional Services
  { value: 'legal', label: 'Legal / Law Firm', group: 'professional' },
  { value: 'accounting_financial', label: 'Accounting & Financial Services', group: 'professional' },
  { value: 'medical', label: 'Medical / Healthcare', group: 'professional' },
  { value: 'pharmacy', label: 'Pharmacy', group: 'professional' },
  { value: 'engineering_architecture', label: 'Engineering & Architecture', group: 'professional' },
  { value: 'it_technology', label: 'IT & Technology / Software', group: 'professional' },
  // Regulated & Specialized
  { value: 'real_estate', label: 'Real Estate & Property', group: 'regulated' },
  { value: 'insurance', label: 'Insurance', group: 'regulated' },
  { value: 'investment_asset_management', label: 'Investment & Asset Management', group: 'regulated' },
  { value: 'education', label: 'Education & Training', group: 'regulated' },
  { value: 'npo_npc', label: 'Non-Profit / NPO / NPC', group: 'regulated' },
  { value: 'agriculture', label: 'Agriculture & Farming', group: 'regulated' },
  { value: 'mining', label: 'Mining & Extraction', group: 'regulated' },
  { value: 'security_services', label: 'Security Services', group: 'regulated' },
  { value: 'cleaning_facilities', label: 'Cleaning & Facilities Management', group: 'regulated' },
];

export const SECTOR_GROUP_LABELS: Record<string, string> = {
  core: 'Core / General',
  professional: 'Professional Services',
  regulated: 'Regulated & Specialized',
};

export function getSectorLabel(sector: Sector): string {
  if (sector === 'other') return 'Other';
  const found = SECTOR_OPTIONS.find(s => s.value === sector);
  return found?.label ?? sector;
}

// --- Provinces ---
export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

// --- Business Structures ---
export interface BusinessStructureOption {
  value: BusinessStructure;
  label: string;
  shortLabel: string;
}

export const BUSINESS_STRUCTURES: BusinessStructureOption[] = [
  { value: 'sole_proprietor', label: 'Sole Proprietor', shortLabel: 'Sole Prop' },
  { value: 'pty_ltd', label: '(Pty) Ltd', shortLabel: '(Pty) Ltd' },
  { value: 'cc', label: 'Close Corporation (CC)', shortLabel: 'CC' },
  { value: 'partnership', label: 'Partnership', shortLabel: 'Partnership' },
  { value: 'npo', label: 'Non-Profit Organisation', shortLabel: 'NPO' },
];

// --- Employee Bands ---
export const EMPLOYEE_BANDS: { value: EmployeeBand; label: string }[] = [
  { value: '0', label: 'Just me (0 employees)' },
  { value: '1-5', label: '1 – 5 employees' },
  { value: '6-20', label: '6 – 20 employees' },
  { value: '21-50', label: '21 – 50 employees' },
  { value: '51+', label: '51+ employees' },
];

// --- Compliance Groups ---
export const COMPLIANCE_GROUP_LABELS: Record<ComplianceGroup, string> = {
  tax_revenue: 'Tax & Revenue',
  company_secretarial: 'Company Secretarial',
  labour_employment: 'Labour & Employment',
  sector_specific: 'Sector-Specific',
  licensing: 'Licensing',
};

export const COMPLIANCE_GROUP_ORDER: ComplianceGroup[] = [
  'company_secretarial',
  'tax_revenue',
  'labour_employment',
  'sector_specific',
  'licensing',
];

// --- Compliance Items ---
export interface DefaultComplianceItem {
  category: ComplianceCategory;
  complianceGroup: ComplianceGroup;
  title: string;
  description: string;
  legalReference: string;
}

export const COMMON_COMPLIANCE_ITEMS: DefaultComplianceItem[] = [
  {
    category: 'cipc_annual_return',
    complianceGroup: 'company_secretarial',
    title: "CIPC Annual Return",
    description: "Every registered company must file an annual return with CIPC within 30 business days of the anniversary of incorporation.",
    legalReference: "Companies Act 71 of 2008 - Section 33",
  },
  {
    category: 'cipc_beneficial_ownership',
    complianceGroup: 'company_secretarial',
    title: "CIPC Beneficial Ownership",
    description: "Submit and maintain a register of beneficial owners with CIPC.",
    legalReference: "Companies Act 71 of 2008",
  },
  {
    category: 'sars_tcs',
    complianceGroup: 'tax_revenue',
    title: "SARS Tax Clearance Status (TCS)",
    description: "Required to do business with government and many corporates. Valid for 1 year. Apply via SARS eFiling.",
    legalReference: "Tax Administration Act 28 of 2011",
  },
  {
    category: 'sars_provisional_tax',
    complianceGroup: 'tax_revenue',
    title: "SARS Provisional Tax",
    description: "Bi-annual submission of provisional tax estimates and payments.",
    legalReference: "Income Tax Act 58 of 1962",
  },
  {
    category: 'turnover_tax',
    complianceGroup: 'tax_revenue',
    title: "Turnover Tax (TT01/TT02/TT03)",
    description: "Simplified tax system for micro businesses with a qualifying turnover. Tracks the R2.3 million threshold.",
    legalReference: "Income Tax Act 58 of 1962",
  },
  {
    category: 'uif',
    complianceGroup: 'labour_employment',
    title: "UIF Registration & Returns",
    description: "Registration and monthly contribution declarations to the Unemployment Insurance Fund.",
    legalReference: "Unemployment Insurance Act 63 of 2001",
  },
  {
    category: 'coida',
    complianceGroup: 'labour_employment',
    title: "COIDA Letter of Good Standing",
    description: "Annual return of earnings and payment to the Compensation Fund.",
    legalReference: "Compensation for Occupational Injuries and Diseases Act 130 of 1993",
  },
  {
    category: 'bbbee',
    complianceGroup: 'licensing',
    title: "B-BBEE Sworn Affidavit / Certificate",
    description: "Required to trade with most large businesses and government. Annual verification or sworn affidavit.",
    legalReference: "Broad-Based Black Economic Empowerment Act 53 of 2003",
  },
  {
    category: 'municipal_licence',
    complianceGroup: 'licensing',
    title: "Business Operating Licence",
    description: "Municipal trading licence required to legally operate. Renewal period varies by municipality.",
    legalReference: "Business Act 71 of 1991",
  },
  {
    category: 'popia',
    complianceGroup: 'sector_specific',
    title: "POPIA Compliance",
    description: "Ensure your business complies with the Protection of Personal Information Act. Appoint an Information Officer and register with the Information Regulator.",
    legalReference: "POPIA Act 4 of 2013",
  },
];

export const SECTOR_SPECIFIC_ITEMS: Partial<Record<Sector, DefaultComplianceItem[]>> = {
  legal: [
    {
      category: 'fidelity_fund',
      complianceGroup: 'sector_specific',
      title: "Fidelity Fund Certificate",
      description: "Required for all practicing attorneys. Valid for 1 year.",
      legalReference: "Attorneys Act",
    },
    {
      category: 'cpd',
      complianceGroup: 'sector_specific',
      title: "CPD Points",
      description: "12 per year, 2 must be ethics (LSSA requirement).",
      legalReference: "LSSA Requirement",
    },
    {
      category: 'trust_account',
      complianceGroup: 'sector_specific',
      title: "Trust Account Audit",
      description: "Annual audit of trust accounts required.",
      legalReference: "Rules of Attorneys Act - Rule 78",
    },
    {
      category: 'fica',
      complianceGroup: 'sector_specific',
      title: "FICA Client Verification",
      description: "Know Your Customer (KYC) requirements for all clients.",
      legalReference: "FICA Act 38 of 2001",
    },
  ],
  medical: [
    {
      category: 'hpcsa_registration',
      complianceGroup: 'sector_specific',
      title: "HPCSA Registration & Annual Renewal",
      description: "Required for all medical practitioners.",
      legalReference: "Health Professions Act 56 of 1974",
    },
    {
      category: 'medical_waste',
      complianceGroup: 'sector_specific',
      title: "Medical Waste Compliance",
      description: "Proper disposal of medical waste required.",
      legalReference: "National Health Act 61 of 2003",
    },
  ],
  pharmacy: [
    {
      category: 'sapc_registration',
      complianceGroup: 'sector_specific',
      title: "SAPC Registration & Annual Fees",
      description: "South African Pharmacy Council registration for pharmacists and pharmacy premises.",
      legalReference: "Pharmacy Act 53 of 1974",
    },
    {
      category: 'medical_waste',
      complianceGroup: 'sector_specific',
      title: "Medical Waste Compliance",
      description: "Proper disposal of pharmaceutical and medical waste required.",
      legalReference: "National Health Act 61 of 2003",
    },
  ],
  accounting_financial: [
    {
      category: 'fsca_licence',
      complianceGroup: 'sector_specific',
      title: "FSCA Licence & Annual Renewal",
      description: "Required for financial service providers.",
      legalReference: "FAIS Act 37 of 2002",
    },
    {
      category: 'fica',
      complianceGroup: 'sector_specific',
      title: "FICA/AML Programme",
      description: "Anti-Money Laundering programme required for accountable institutions.",
      legalReference: "FICA Act 38 of 2001",
    },
    {
      category: 'fic_registration',
      complianceGroup: 'sector_specific',
      title: "FIC Registration",
      description: "Register with the Financial Intelligence Centre as an accountable or reporting institution.",
      legalReference: "FICA Act 38 of 2001",
    },
  ],
  insurance: [
    {
      category: 'fsca_licence',
      complianceGroup: 'sector_specific',
      title: "FSCA Licence & Compliance",
      description: "Financial Sector Conduct Authority licence for insurance intermediaries.",
      legalReference: "Insurance Act 18 of 2017",
    },
    {
      category: 'fica',
      complianceGroup: 'sector_specific',
      title: "FICA/AML Programme",
      description: "Anti-Money Laundering programme required.",
      legalReference: "FICA Act 38 of 2001",
    },
  ],
  investment_asset_management: [
    {
      category: 'fsca_licence',
      complianceGroup: 'sector_specific',
      title: "FSCA Licence & Annual Levy",
      description: "Required for all financial service providers managing investments.",
      legalReference: "FAIS Act 37 of 2002",
    },
    {
      category: 'fica',
      complianceGroup: 'sector_specific',
      title: "FICA/AML Programme",
      description: "Anti-Money Laundering programme and client due diligence.",
      legalReference: "FICA Act 38 of 2001",
    },
    {
      category: 'cybersecurity_plan',
      complianceGroup: 'sector_specific',
      title: "Cybersecurity Incident Response Plan",
      description: "Required for financial institutions per FSCA directives.",
      legalReference: "FSCA Joint Standard on Cybersecurity",
    },
  ],
  construction: [
    {
      category: 'nhbrc_registration',
      complianceGroup: 'sector_specific',
      title: "NHBRC Registration",
      description: "National Home Builders Registration Council registration for residential builders.",
      legalReference: "Housing Consumers Protection Measures Act 95 of 1998",
    },
  ],
  real_estate: [
    {
      category: 'eaab_registration',
      complianceGroup: 'sector_specific',
      title: "EAAB Registration & Fidelity Fund",
      description: "Estate Agency Affairs Board registration and annual renewal for all estate agents.",
      legalReference: "Estate Agency Affairs Act 112 of 1976",
    },
    {
      category: 'fica',
      complianceGroup: 'sector_specific',
      title: "FICA Client Verification",
      description: "Know Your Customer (KYC) requirements for property transactions.",
      legalReference: "FICA Act 38 of 2001",
    },
  ],
  security_services: [
    {
      category: 'psira_registration',
      complianceGroup: 'sector_specific',
      title: "PSIRA Registration & Annual Fees",
      description: "Private Security Industry Regulatory Authority registration for all security businesses and officers.",
      legalReference: "Private Security Industry Regulation Act 56 of 2001",
    },
  ],
  engineering_architecture: [
    {
      category: 'ecsa_registration',
      complianceGroup: 'sector_specific',
      title: "ECSA / SACAP Registration",
      description: "Engineering Council of SA or SA Council for the Architectural Profession registration and annual fees.",
      legalReference: "Engineering Profession Act 46 of 2000",
    },
    {
      category: 'cpd',
      complianceGroup: 'sector_specific',
      title: "CPD Points",
      description: "Continuing Professional Development requirements as prescribed by your council.",
      legalReference: "ECSA / SACAP Rules",
    },
  ],
};

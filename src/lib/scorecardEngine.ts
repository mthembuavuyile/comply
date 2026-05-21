import { Business, Supplier, SpendLog } from "../types";
import { BEE_LEVEL_THRESHOLDS, SUPPLIER_RECOGNITION_MAPPINGS } from "../constants";

export interface ScorecardResult {
  points: {
    ownership: number;
    skills: number;
    procurement: number;
    esdSubtotal: number; // ED + SD (15 pts)
    esdTotal: number; // Procurement + ED + SD (40 pts)
    sed: number;
    total: number;
  };
  targets: {
    skillsTarget: number;
    skillsSpend: number;
    skillsGap: number;
    edTarget: number;
    edSpend: number;
    edGap: number;
    sdTarget: number;
    sdSpend: number;
    sdGap: number;
    sedTarget: number;
    sedSpend: number;
    sedGap: number;
    procurementTotalSpend: number;
    procurementWeightedSpend: number;
  };
  projectedLevel: number;
}

export function calculateScorecard(
  business: Business | null | undefined,
  suppliers: Supplier[],
  spendLogs: SpendLog[]
): ScorecardResult {
  // Default fallback values
  const blackOwnership = business?.blackOwnershipPercent || 0;
  const blackWomenOwnership = business?.blackWomenOwnershipPercent || 0;
  const payroll = business?.annualPayroll || 0;
  const npat = business?.npat || 0;

  // 1. Ownership Points (Max 25)
  // Target: Black Ownership voting rights/economic interest = 25.1% -> 20 points
  // Target: Black Women ownership voting rights/economic interest = 10% -> 5 points
  const blackOwnershipPoints = Math.min(20, (blackOwnership / 25.1) * 20);
  const blackWomenOwnershipPoints = Math.min(5, (blackWomenOwnership / 10.0) * 5);
  const ownershipPoints = Math.round((blackOwnershipPoints + blackWomenOwnershipPoints) * 100) / 100;

  // 2. Skills Development Points (Max 20)
  // Target: 6% of payroll spent on skills development
  const skillsTarget = Math.round(payroll * 0.06 * 100) / 100;
  const skillsSpend = spendLogs
    .filter(log => log.category === 'skills_development')
    .reduce((sum, log) => sum + log.amount, 0);
  const skillsPoints = skillsTarget > 0 
    ? Math.round(Math.min(20, (skillsSpend / skillsTarget) * 20) * 100) / 100
    : 0;
  const skillsGap = Math.max(0, skillsTarget - skillsSpend);

  // 3. Procurement Points (Max 25)
  // Calculate total spend and weighted recognition spend
  let procurementTotalSpend = 0;
  let procurementWeightedSpend = 0;

  suppliers.forEach(supplier => {
    const spend = supplier.annualSpend || 0;
    const level = supplier.beeLevel || 9;
    const factor = SUPPLIER_RECOGNITION_MAPPINGS[level]?.percent || 0;
    procurementTotalSpend += spend;
    procurementWeightedSpend += spend * factor;
  });

  const procurementRatio = procurementTotalSpend > 0 
    ? procurementWeightedSpend / procurementTotalSpend 
    : 0;
  // Assume target recognition rate is 80%
  const procurementPoints = Math.round(Math.min(25, (procurementRatio / 0.8) * 25) * 100) / 100;

  // 4. ESD Points (Enterprise & Supplier Development)
  // ED Target = 1% of NPAT. SD Target = 2% of NPAT.
  // Fallbacks if NPAT is not set or non-positive: ED target = R10,000, SD target = R20,000
  const edTarget = npat > 0 ? Math.round(npat * 0.01 * 100) / 100 : 10000;
  const sdTarget = npat > 0 ? Math.round(npat * 0.02 * 100) / 100 : 20000;

  const edSpend = spendLogs
    .filter(log => log.category === 'enterprise_development')
    .reduce((sum, log) => sum + log.amount, 0);
  const sdSpend = spendLogs
    .filter(log => log.category === 'supplier_development')
    .reduce((sum, log) => sum + log.amount, 0);

  const edPoints = Math.round(Math.min(5, (edSpend / edTarget) * 5) * 100) / 100;
  const sdPoints = Math.round(Math.min(10, (sdSpend / sdTarget) * 10) * 100) / 100;
  const esdSubtotal = edPoints + sdPoints;
  const esdTotal = Math.round((procurementPoints + esdSubtotal) * 100) / 100;

  const edGap = Math.max(0, edTarget - edSpend);
  const sdGap = Math.max(0, sdTarget - sdSpend);

  // 5. SED Points (Socio-Economic Development - Max 5)
  // Target: 1% of NPAT spent on donations
  // Fallback if NPAT is non-positive: SED target = R5,000
  const sedTarget = npat > 0 ? Math.round(npat * 0.01 * 100) / 100 : 5000;
  const sedSpend = spendLogs
    .filter(log => log.category === 'socio_economic_development')
    .reduce((sum, log) => sum + log.amount, 0);
  const sedPoints = Math.round(Math.min(5, (sedSpend / sedTarget) * 5) * 100) / 100;
  const sedGap = Math.max(0, sedTarget - sedSpend);

  // Total points calculation (Capped at 100 for core scorecard, or standard sum)
  const total = Math.round((ownershipPoints + skillsPoints + esdTotal + sedPoints) * 100) / 100;
  
  // Project BEE Level
  let projectedLevel = 9;
  for (const t of BEE_LEVEL_THRESHOLDS) {
    if (total >= t.minPoints) {
      projectedLevel = t.level;
      break;
    }
  }

  return {
    points: {
      ownership: ownershipPoints,
      skills: skillsPoints,
      procurement: procurementPoints,
      esdSubtotal,
      esdTotal,
      sed: sedPoints,
      total,
    },
    targets: {
      skillsTarget,
      skillsSpend,
      skillsGap,
      edTarget,
      edSpend,
      edGap,
      sdTarget,
      sdSpend,
      sdGap,
      sedTarget,
      sedSpend,
      sedGap,
      procurementTotalSpend,
      procurementWeightedSpend,
    },
    projectedLevel,
  };
}

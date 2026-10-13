export interface HoursRange {
  low: number;
  likely: number;
  high: number;
}

export interface FollowUpOption {
  label: string;
  hoursAdjustment: number;
}

export interface FollowUp {
  id: string;
  question: string;
  options: FollowUpOption[];
}

export interface FeatureDefinition {
  id: string;
  name: string;
  baseHoursRange: HoursRange;
  integrationWeight: number; // 1-5
  followUps?: FollowUp[];
}

export interface EstimationResult {
  rawFeatureTotal: number;
  surcharge: number;
  setupOverhead: number;
  qaOverhead: number;
  pmOverhead: number;
  subtotal: number;
  lowEstimateHours: number;
  highEstimateHours: number;
  lowEstimateCost: number;
  highEstimateCost: number;
}

export function calculateEstimate(
  selectedFeatures: FeatureDefinition[],
  followUpAnswers: Record<string, string>,
  riskLevel: number = 1.3,
  hourlyRate: number = 240,
  timelineMultiplier: number = 1.0
): EstimationResult {
  if (!Array.isArray(selectedFeatures)) throw new TypeError('selectedFeatures must be an array')
  if (!followUpAnswers || typeof followUpAnswers !== 'object' || Array.isArray(followUpAnswers)) {
    throw new TypeError('followUpAnswers must be an object')
  }
  if (![riskLevel, hourlyRate, timelineMultiplier].every(Number.isFinite)) {
    throw new RangeError('Estimate multipliers and rate must be finite numbers')
  }
  if (riskLevel <= 0 || hourlyRate < 0 || timelineMultiplier <= 0) {
    throw new RangeError('Estimate multipliers must be positive and the rate cannot be negative')
  }

  if (selectedFeatures.length === 0) {
    return {
      rawFeatureTotal: 0,
      surcharge: 0,
      setupOverhead: 0,
      qaOverhead: 0,
      pmOverhead: 0,
      subtotal: 0,
      lowEstimateHours: 0,
      highEstimateHours: 0,
      lowEstimateCost: 0,
      highEstimateCost: 0
    };
  }

  let rawFeatureTotal = 0;
  let totalIntegrationWeight = 0;
  
  for (const feature of selectedFeatures) {
    const { low, likely, high } = feature.baseHoursRange ?? {}
    if (![low, likely, high, feature.integrationWeight].every(Number.isFinite)) {
      throw new RangeError('Feature hours and integration weight must be finite numbers')
    }
    if (low < 0 || low > likely || likely > high) {
      throw new RangeError('Feature hours must satisfy 0 <= low <= likely <= high')
    }
    if (feature.integrationWeight < 1 || feature.integrationWeight > 5) {
      throw new RangeError('Integration weight must be between 1 and 5')
    }
    let adjustment = 0;
    if (feature.followUps) {
      for (const fu of feature.followUps) {
        const answerLabel = followUpAnswers[fu.id];
        if (answerLabel) {
          const option = fu.options.find(o => o.label === answerLabel);
          if (option) {
            if (!Number.isFinite(option.hoursAdjustment) || option.hoursAdjustment < 0) {
              throw new RangeError('Follow-up adjustments must be non-negative finite numbers')
            }
            adjustment += option.hoursAdjustment;
          }
        }
      }
    }
    
    const pertHours = (feature.baseHoursRange.low + 4 * feature.baseHoursRange.likely + feature.baseHoursRange.high) / 6;
    rawFeatureTotal += (pertHours + adjustment);
    totalIntegrationWeight += feature.integrationWeight;
  }
  
  let surcharge = 0;
  if (selectedFeatures.length >= 2) {
    const avgIntegrationWeight = totalIntegrationWeight / selectedFeatures.length;
    // surcharge = rawFeatureTotal * (0.05 * (avgIntegrationWeight - 1))
    surcharge = rawFeatureTotal * (0.05 * Math.max(0, avgIntegrationWeight - 1));
    const maxSurcharge = rawFeatureTotal * 0.30;
    if (surcharge > maxSurcharge) {
      surcharge = maxSurcharge;
    }
  }
  
  const setupOverhead = 8; // flat 8 hours
  const qaOverhead = 0.15 * (rawFeatureTotal + surcharge);
  const pmOverhead = 0.10 * (rawFeatureTotal + surcharge);
  
  const subtotal = setupOverhead + rawFeatureTotal + surcharge + qaOverhead + pmOverhead;
  
  const lowEstimateHours = subtotal * riskLevel * 0.85;
  const highEstimateHours = subtotal * riskLevel * 1.20;
  
  return {
    rawFeatureTotal,
    surcharge,
    setupOverhead,
    qaOverhead,
    pmOverhead,
    subtotal,
    lowEstimateHours,
    highEstimateHours,
    lowEstimateCost: lowEstimateHours * hourlyRate * timelineMultiplier,
    highEstimateCost: highEstimateHours * hourlyRate * timelineMultiplier
  };
}

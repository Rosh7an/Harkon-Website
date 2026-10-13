import { describe, it, expect } from 'vitest';
import { calculateEstimate, FeatureDefinition } from '../utils/estimationEngine';

describe('calculateEstimate', () => {
  const mockFeatures: FeatureDefinition[] = [
    {
      id: 'f1',
      name: 'Auth',
      baseHoursRange: { low: 10, likely: 15, high: 26 }, // PERT: (10 + 60 + 26) / 6 = 96 / 6 = 16
      integrationWeight: 1
    },
    {
      id: 'f2',
      name: 'Stripe',
      baseHoursRange: { low: 12, likely: 20, high: 34 }, // PERT: (12 + 80 + 34) / 6 = 126 / 6 = 21
      integrationWeight: 3,
      followUps: [
        {
          id: 'billing',
          question: 'Billing Type',
          options: [
            { label: 'One-time', hoursAdjustment: 0 },
            { label: 'Recurring', hoursAdjustment: 5 }
          ]
        }
      ]
    },
    {
      id: 'f3',
      name: 'Dashboard',
      baseHoursRange: { low: 20, likely: 30, high: 46 }, // PERT: (20 + 120 + 46) / 6 = 186 / 6 = 31
      integrationWeight: 5
    }
  ];

  it('calculates for a single feature without follow-ups', () => {
    const result = calculateEstimate([mockFeatures[0]], {}, 1.0, 100, 1.0);
    expect(result.rawFeatureTotal).toBe(16);
    expect(result.surcharge).toBe(0); // single feature -> no surcharge
    expect(result.setupOverhead).toBe(8);
    expect(result.qaOverhead).toBe(16 * 0.15); // 2.4
    expect(result.pmOverhead).toBe(16 * 0.10); // 1.6
    const subtotal = 16 + 0 + 8 + 2.4 + 1.6; // 28
    expect(result.subtotal).toBe(subtotal);
    expect(result.lowEstimateHours).toBeCloseTo(subtotal * 0.85);
    expect(result.highEstimateHours).toBeCloseTo(subtotal * 1.20);
    expect(result.lowEstimateCost).toBeCloseTo(subtotal * 0.85 * 100);
    expect(result.highEstimateCost).toBeCloseTo(subtotal * 1.20 * 100);
  });

  it('calculates for multiple features and applies surcharge', () => {
    const result = calculateEstimate([mockFeatures[0], mockFeatures[2]], {}, 1.0, 100, 1.0);
    const rawTotal = 16 + 31; // 47
    expect(result.rawFeatureTotal).toBe(rawTotal);

    // avgIntegrationWeight = (1 + 5) / 2 = 3
    // surcharge = rawTotal * 0.05 * (3 - 1) = 47 * 0.10 = 4.7
    expect(result.surcharge).toBeCloseTo(4.7);
  });

  it('applies follow-up adjustments correctly', () => {
    const result = calculateEstimate([mockFeatures[1]], { billing: 'Recurring' }, 1.0, 100, 1.0);
    // PERT = 21, Adjustment = 5, Total = 26
    expect(result.rawFeatureTotal).toBe(26);
  });

  it('rejects an integration weight outside the supported 1-5 range', () => {
    const heavyFeature: FeatureDefinition = {
      id: 'heavy',
      name: 'Heavy',
      baseHoursRange: { low: 6, likely: 6, high: 6 }, // 6 hours
      integrationWeight: 10
    };
    expect(() => calculateEstimate([heavyFeature], {}, 1.0, 100, 1.0)).toThrow(/between 1 and 5/);
  });

  it('scales cost based on risk multiplier', () => {
    const resultNormal = calculateEstimate([mockFeatures[0]], {}, 1.0, 100, 1.0);
    const resultHighRisk = calculateEstimate([mockFeatures[0]], {}, 1.6, 100, 1.0);
    
    expect(resultHighRisk.lowEstimateHours).toBeCloseTo(resultNormal.lowEstimateHours * 1.6);
    expect(resultHighRisk.highEstimateHours).toBeCloseTo(resultNormal.highEstimateHours * 1.6);
  });

  it('returns zero values for an empty selection', () => {
    expect(calculateEstimate([], {}, 1.3, 240, 1)).toEqual({
      rawFeatureTotal: 0,
      surcharge: 0,
      setupOverhead: 0,
      qaOverhead: 0,
      pmOverhead: 0,
      subtotal: 0,
      lowEstimateHours: 0,
      highEstimateHours: 0,
      lowEstimateCost: 0,
      highEstimateCost: 0,
    });
  });

  it('applies the expedited timeline multiplier to cost but not hours', () => {
    const standard = calculateEstimate([mockFeatures[0]], {}, 1.0, 100, 1.0);
    const expedited = calculateEstimate([mockFeatures[0]], {}, 1.0, 100, 1.25);
    expect(expedited.lowEstimateHours).toBe(standard.lowEstimateHours);
    expect(expedited.highEstimateHours).toBe(standard.highEstimateHours);
    expect(expedited.lowEstimateCost).toBeCloseTo(standard.lowEstimateCost * 1.25);
  });

  it('rejects null input and negative commercial values', () => {
    expect(() => calculateEstimate(null as unknown as FeatureDefinition[], {}, 1.3, 240, 1)).toThrow(TypeError);
    expect(() => calculateEstimate([mockFeatures[0]], {}, -1, 240, 1)).toThrow(RangeError);
    expect(() => calculateEstimate([mockFeatures[0]], {}, 1.3, -240, 1)).toThrow(RangeError);
  });
});

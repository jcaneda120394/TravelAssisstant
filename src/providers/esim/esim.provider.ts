import type { EsimPlan } from '@/types/domain';

export interface EsimProvider {
  readonly name: string;
  searchByCountry(countryCode: string): Promise<EsimPlan[]>;
  getPlan(planId: string): Promise<EsimPlan | null>;
}

export class MockEsimProvider implements EsimProvider {
  readonly name = 'mock-esim';

  async searchByCountry(countryCode: string): Promise<EsimPlan[]> {
    const code = countryCode.toUpperCase();
    return [
      {
        id: `mock-esim-${code}-1`,
        provider: 'MockAir',
        countryCode: code,
        countryName: code,
        dataGb: 3,
        validityDays: 15,
        price: 9.5,
        currency: 'USD',
        network: 'Sample Mobile',
        supports5g: true,
        hotspot: true,
        isMock: true,
      },
      {
        id: `mock-esim-${code}-2`,
        provider: 'MockNomad',
        countryCode: code,
        countryName: code,
        dataGb: 10,
        validityDays: 30,
        price: 24,
        currency: 'USD',
        network: 'Sample Telecom',
        supports5g: true,
        hotspot: true,
        isMock: true,
      },
    ];
  }

  async getPlan(planId: string): Promise<EsimPlan | null> {
    const plans = await this.searchByCountry('XX');
    return plans.find((plan) => plan.id === planId) ?? null;
  }
}

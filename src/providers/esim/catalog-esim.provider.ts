import type { EsimProvider } from '@/providers/esim/esim.provider';
import type { EsimPlan } from '@/types/domain';

/** Public market-style catalog until an eSIM partner API key is configured. */
const CATALOG: Record<
  string,
  { countryName: string; plans: Omit<EsimPlan, 'id' | 'countryCode' | 'countryName' | 'isMock'>[] }
> = {
  JP: {
    countryName: 'Japan',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 11.5,
        currency: 'USD',
        network: 'KDDI / SoftBank',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/japan-esim',
        bestFor: 'Short city trip',
      },
      {
        provider: 'Nomad',
        dataGb: 10,
        validityDays: 30,
        price: 24,
        currency: 'USD',
        network: 'SoftBank',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.getnomad.app/',
        bestFor: 'Heavier data use',
      },
    ],
  },
  PH: {
    countryName: 'Philippines',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 9.5,
        currency: 'USD',
        network: 'Globe / Smart',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/philippines-esim',
        bestFor: 'Week-long stay',
      },
      {
        provider: 'Nomad',
        dataGb: 5,
        validityDays: 30,
        price: 15,
        currency: 'USD',
        network: 'Globe',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.getnomad.app/',
        bestFor: 'Balanced price/data',
      },
    ],
  },
  US: {
    countryName: 'United States',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 16,
        currency: 'USD',
        network: 'T-Mobile',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/united-states-esim',
        bestFor: 'Most travelers',
      },
    ],
  },
  KR: {
    countryName: 'South Korea',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 10.5,
        currency: 'USD',
        network: 'SK Telecom / KT',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/south-korea-esim',
        bestFor: 'Seoul / Busan trip',
      },
    ],
  },
  TH: {
    countryName: 'Thailand',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 12.5,
        currency: 'USD',
        network: 'AIS / TrueMove',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/thailand-esim',
        bestFor: 'Beach + city',
      },
    ],
  },
};

function defaultPlans(code: string): EsimPlan[] {
  return [
    {
      id: `catalog-${code}-1`,
      provider: 'Airalo',
      countryCode: code,
      countryName: code,
      dataGb: 3,
      validityDays: 30,
      price: 12,
      currency: 'USD',
      network: 'Local partner',
      supports5g: true,
      hotspot: true,
      purchaseUrl: `https://www.airalo.com/`,
      bestFor: 'Starter plan',
      isMock: false,
    },
  ];
}

export class CatalogEsimProvider implements EsimProvider {
  readonly name = 'esim-catalog';

  async searchByCountry(countryCode: string): Promise<EsimPlan[]> {
    const code = countryCode.toUpperCase();
    const entry = CATALOG[code];
    if (!entry) {
      return defaultPlans(code);
    }
    return entry.plans.map((plan, index) => ({
      ...plan,
      id: `catalog-${code}-${index + 1}`,
      countryCode: code,
      countryName: entry.countryName,
      isMock: false,
    }));
  }

  async getPlan(planId: string): Promise<EsimPlan | null> {
    const match = /^catalog-([A-Z]{2})-/.exec(planId);
    if (!match?.[1]) {
      return null;
    }
    const plans = await this.searchByCountry(match[1]);
    return plans.find((plan) => plan.id === planId) ?? null;
  }
}

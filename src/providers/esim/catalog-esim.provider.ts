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
  SG: {
    countryName: 'Singapore',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 9,
        currency: 'USD',
        network: 'Singtel / StarHub',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/singapore-esim',
        bestFor: 'Short stopover',
      },
    ],
  },
  VN: {
    countryName: 'Vietnam',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 8.5,
        currency: 'USD',
        network: 'Viettel / Vinaphone',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/vietnam-esim',
        bestFor: 'North–south travel',
      },
    ],
  },
  ID: {
    countryName: 'Indonesia',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 9,
        currency: 'USD',
        network: 'Telkomsel',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/indonesia-esim',
        bestFor: 'Bali / Jakarta',
      },
    ],
  },
  MY: {
    countryName: 'Malaysia',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 9.5,
        currency: 'USD',
        network: 'Maxis / Digi',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/malaysia-esim',
        bestFor: 'KL + islands',
      },
    ],
  },
  HK: {
    countryName: 'Hong Kong',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 8,
        currency: 'USD',
        network: 'CSL / 3HK',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/hong-kong-esim',
        bestFor: 'City weekend',
      },
    ],
  },
  TW: {
    countryName: 'Taiwan',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 3,
        validityDays: 30,
        price: 9,
        currency: 'USD',
        network: 'Chunghwa / FarEasTone',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/taiwan-esim',
        bestFor: 'Taipei trip',
      },
    ],
  },
  FR: {
    countryName: 'France',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 16,
        currency: 'USD',
        network: 'Orange / SFR',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/france-esim',
        bestFor: 'EU city hopping',
      },
    ],
  },
  GB: {
    countryName: 'United Kingdom',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 16,
        currency: 'USD',
        network: 'EE / O2',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/united-kingdom-esim',
        bestFor: 'London + UK travel',
      },
    ],
  },
  AU: {
    countryName: 'Australia',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 18,
        currency: 'USD',
        network: 'Optus / Vodafone',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/australia-esim',
        bestFor: 'East coast trip',
      },
    ],
  },
  DE: {
    countryName: 'Germany',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 15,
        currency: 'USD',
        network: 'Telekom / Vodafone',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/germany-esim',
        bestFor: 'Rail travel',
      },
    ],
  },
  CA: {
    countryName: 'Canada',
    plans: [
      {
        provider: 'Airalo',
        dataGb: 5,
        validityDays: 30,
        price: 18,
        currency: 'USD',
        network: 'Rogers / Bell',
        supports5g: true,
        hotspot: true,
        purchaseUrl: 'https://www.airalo.com/canada-esim',
        bestFor: 'City + road trip',
      },
    ],
  },
};

function defaultPlans(code: string): EsimPlan[] {
  const name =
    (
      {
        CN: 'China',
        ES: 'Spain',
        IT: 'Italy',
        NZ: 'New Zealand',
      } as Record<string, string>
    )[code] ?? code;

  return [
    {
      id: `catalog-${code}-1`,
      provider: 'Airalo',
      countryCode: code,
      countryName: name,
      dataGb: 3,
      validityDays: 30,
      price: 12,
      currency: 'USD',
      network: 'Local partner',
      supports5g: true,
      hotspot: true,
      purchaseUrl: 'https://www.airalo.com/',
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

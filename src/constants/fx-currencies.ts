export type FxCurrencyOption = {
  code: string;
  currencyName: string;
  /** Primary country/region label shown in the UI */
  country: string;
  /** Extra terms for search (aliases, cities, demonyms) */
  aliases?: string[];
};

/**
 * Travel-focused currency catalog for the converter search field.
 * Searchable by country, currency name, or ISO code. Rates use Frankfurter + fallback.
 */
export const FX_CURRENCY_OPTIONS: FxCurrencyOption[] = [
  {
    code: 'USD',
    currencyName: 'United States Dollar',
    country: 'United States',
    aliases: ['USA', 'America', 'US'],
  },
  {
    code: 'EUR',
    currencyName: 'Euro',
    country: 'Eurozone',
    aliases: ['Europe', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Portugal', 'Ireland', 'Belgium', 'Austria', 'Finland', 'Greece'],
  },
  {
    code: 'GBP',
    currencyName: 'British Pound',
    country: 'United Kingdom',
    aliases: ['UK', 'Britain', 'England', 'Scotland', 'Wales'],
  },
  {
    code: 'JPY',
    currencyName: 'Japanese Yen',
    country: 'Japan',
    aliases: ['JP', 'Tokyo'],
  },
  {
    code: 'PHP',
    currencyName: 'Philippine Peso',
    country: 'Philippines',
    aliases: ['PH', 'Manila', 'peso'],
  },
  {
    code: 'KRW',
    currencyName: 'South Korean Won',
    country: 'South Korea',
    aliases: ['Korea', 'KR', 'Seoul'],
  },
  {
    code: 'CNY',
    currencyName: 'Chinese Yuan',
    country: 'China',
    aliases: ['CN', 'RMB', 'Beijing', 'Shanghai'],
  },
  {
    code: 'HKD',
    currencyName: 'Hong Kong Dollar',
    country: 'Hong Kong',
    aliases: ['HK'],
  },
  {
    code: 'TWD',
    currencyName: 'New Taiwan Dollar',
    country: 'Taiwan',
    aliases: ['TW', 'Taipei'],
  },
  {
    code: 'AUD',
    currencyName: 'Australian Dollar',
    country: 'Australia',
    aliases: ['AU', 'Sydney', 'Melbourne'],
  },
  {
    code: 'CAD',
    currencyName: 'Canadian Dollar',
    country: 'Canada',
    aliases: ['CA', 'Toronto', 'Vancouver'],
  },
  {
    code: 'SGD',
    currencyName: 'Singapore Dollar',
    country: 'Singapore',
    aliases: ['SG'],
  },
  {
    code: 'THB',
    currencyName: 'Thai Baht',
    country: 'Thailand',
    aliases: ['TH', 'Bangkok', 'baht'],
  },
  {
    code: 'VND',
    currencyName: 'Vietnamese Dong',
    country: 'Vietnam',
    aliases: ['VN', 'Hanoi', 'Ho Chi Minh'],
  },
  {
    code: 'IDR',
    currencyName: 'Indonesian Rupiah',
    country: 'Indonesia',
    aliases: ['ID', 'Bali', 'Jakarta'],
  },
  {
    code: 'MYR',
    currencyName: 'Malaysian Ringgit',
    country: 'Malaysia',
    aliases: ['MY', 'Kuala Lumpur'],
  },
  {
    code: 'INR',
    currencyName: 'Indian Rupee',
    country: 'India',
    aliases: ['IN', 'Delhi', 'Mumbai'],
  },
  {
    code: 'NZD',
    currencyName: 'New Zealand Dollar',
    country: 'New Zealand',
    aliases: ['NZ', 'Auckland'],
  },
  {
    code: 'CHF',
    currencyName: 'Swiss Franc',
    country: 'Switzerland',
    aliases: ['CH', 'Zurich'],
  },
  {
    code: 'SEK',
    currencyName: 'Swedish Krona',
    country: 'Sweden',
    aliases: ['SE', 'Stockholm'],
  },
  {
    code: 'NOK',
    currencyName: 'Norwegian Krone',
    country: 'Norway',
    aliases: ['NO', 'Oslo'],
  },
  {
    code: 'DKK',
    currencyName: 'Danish Krone',
    country: 'Denmark',
    aliases: ['DK', 'Copenhagen'],
  },
  {
    code: 'PLN',
    currencyName: 'Polish Zloty',
    country: 'Poland',
    aliases: ['PL', 'Warsaw'],
  },
  {
    code: 'CZK',
    currencyName: 'Czech Koruna',
    country: 'Czechia',
    aliases: ['CZ', 'Czech Republic', 'Prague'],
  },
  {
    code: 'HUF',
    currencyName: 'Hungarian Forint',
    country: 'Hungary',
    aliases: ['HU', 'Budapest'],
  },
  {
    code: 'TRY',
    currencyName: 'Turkish Lira',
    country: 'Turkey',
    aliases: ['TR', 'Istanbul'],
  },
  {
    code: 'AED',
    currencyName: 'UAE Dirham',
    country: 'United Arab Emirates',
    aliases: ['UAE', 'Dubai', 'Abu Dhabi'],
  },
  {
    code: 'SAR',
    currencyName: 'Saudi Riyal',
    country: 'Saudi Arabia',
    aliases: ['SA', 'Riyadh'],
  },
  {
    code: 'ILS',
    currencyName: 'Israeli Shekel',
    country: 'Israel',
    aliases: ['IL', 'Tel Aviv'],
  },
  {
    code: 'ZAR',
    currencyName: 'South African Rand',
    country: 'South Africa',
    aliases: ['ZA', 'Cape Town', 'Johannesburg'],
  },
  {
    code: 'BRL',
    currencyName: 'Brazilian Real',
    country: 'Brazil',
    aliases: ['BR', 'Rio', 'Sao Paulo'],
  },
  {
    code: 'MXN',
    currencyName: 'Mexican Peso',
    country: 'Mexico',
    aliases: ['MX', 'Mexico City'],
  },
  {
    code: 'ARS',
    currencyName: 'Argentine Peso',
    country: 'Argentina',
    aliases: ['AR', 'Buenos Aires'],
  },
  {
    code: 'CLP',
    currencyName: 'Chilean Peso',
    country: 'Chile',
    aliases: ['CL', 'Santiago'],
  },
  {
    code: 'COP',
    currencyName: 'Colombian Peso',
    country: 'Colombia',
    aliases: ['CO', 'Bogota'],
  },
  {
    code: 'PEN',
    currencyName: 'Peruvian Sol',
    country: 'Peru',
    aliases: ['PE', 'Lima'],
  },
  {
    code: 'EGP',
    currencyName: 'Egyptian Pound',
    country: 'Egypt',
    aliases: ['EG', 'Cairo'],
  },
  {
    code: 'NGN',
    currencyName: 'Nigerian Naira',
    country: 'Nigeria',
    aliases: ['NG', 'Lagos'],
  },
  {
    code: 'KES',
    currencyName: 'Kenyan Shilling',
    country: 'Kenya',
    aliases: ['KE', 'Nairobi'],
  },
  {
    code: 'RUB',
    currencyName: 'Russian Ruble',
    country: 'Russia',
    aliases: ['RU', 'Moscow'],
  },
  {
    code: 'UAH',
    currencyName: 'Ukrainian Hryvnia',
    country: 'Ukraine',
    aliases: ['UA', 'Kyiv'],
  },
  {
    code: 'PKR',
    currencyName: 'Pakistani Rupee',
    country: 'Pakistan',
    aliases: ['PK', 'Karachi'],
  },
  {
    code: 'BDT',
    currencyName: 'Bangladeshi Taka',
    country: 'Bangladesh',
    aliases: ['BD', 'Dhaka'],
  },
  {
    code: 'LKR',
    currencyName: 'Sri Lankan Rupee',
    country: 'Sri Lanka',
    aliases: ['LK', 'Colombo'],
  },
  {
    code: 'NPR',
    currencyName: 'Nepalese Rupee',
    country: 'Nepal',
    aliases: ['NP', 'Kathmandu'],
  },
  {
    code: 'KHR',
    currencyName: 'Cambodian Riel',
    country: 'Cambodia',
    aliases: ['KH', 'Phnom Penh'],
  },
  {
    code: 'LAK',
    currencyName: 'Lao Kip',
    country: 'Laos',
    aliases: ['LA', 'Vientiane'],
  },
  {
    code: 'MMK',
    currencyName: 'Myanmar Kyat',
    country: 'Myanmar',
    aliases: ['MM', 'Burma', 'Yangon'],
  },
  {
    code: 'MOP',
    currencyName: 'Macanese Pataca',
    country: 'Macao',
    aliases: ['MO', 'Macau'],
  },
  {
    code: 'QAR',
    currencyName: 'Qatari Riyal',
    country: 'Qatar',
    aliases: ['QA', 'Doha'],
  },
  {
    code: 'KWD',
    currencyName: 'Kuwaiti Dinar',
    country: 'Kuwait',
    aliases: ['KW'],
  },
  {
    code: 'BHD',
    currencyName: 'Bahraini Dinar',
    country: 'Bahrain',
    aliases: ['BH'],
  },
  {
    code: 'OMR',
    currencyName: 'Omani Rial',
    country: 'Oman',
    aliases: ['OM', 'Muscat'],
  },
  {
    code: 'JOD',
    currencyName: 'Jordanian Dinar',
    country: 'Jordan',
    aliases: ['JO', 'Amman'],
  },
  {
    code: 'ISK',
    currencyName: 'Icelandic Krona',
    country: 'Iceland',
    aliases: ['IS', 'Reykjavik'],
  },
  {
    code: 'RON',
    currencyName: 'Romanian Leu',
    country: 'Romania',
    aliases: ['RO', 'Bucharest'],
  },
  {
    code: 'BGN',
    currencyName: 'Bulgarian Lev',
    country: 'Bulgaria',
    aliases: ['BG', 'Sofia'],
  },
  {
    code: 'HRK',
    currencyName: 'Croatian Kuna',
    country: 'Croatia',
    aliases: ['HR', 'Zagreb'],
  },
  {
    code: 'RSD',
    currencyName: 'Serbian Dinar',
    country: 'Serbia',
    aliases: ['RS', 'Belgrade'],
  },
];

export function findFxCurrency(code: string): FxCurrencyOption | undefined {
  const upper = code.toUpperCase();
  return FX_CURRENCY_OPTIONS.find((item) => item.code === upper);
}

export function isFxCurrencyCode(code: string): boolean {
  return Boolean(findFxCurrency(code));
}

export function formatFxCurrencyLabel(code: string): string {
  const match = findFxCurrency(code);
  const symbol = getCurrencySymbol(code);
  if (!match) {
    return symbol === code.toUpperCase() ? code.toUpperCase() : `${symbol} ${code.toUpperCase()}`;
  }
  const codePart = symbol === match.code ? match.code : `${symbol} ${match.code}`;
  return `${match.country} · ${codePart}`;
}

export function formatFxCurrencyName(code: string): string {
  return findFxCurrency(code)?.currencyName ?? code.toUpperCase();
}

/** Currency symbol for display (e.g. PHP → ₱, JPY → ¥). */
export function getCurrencySymbol(code: string): string {
  const upper = code.trim().toUpperCase() || 'USD';
  const fallback: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    PHP: '₱',
    KRW: '₩',
    THB: '฿',
    INR: '₹',
    VND: '₫',
    IDR: 'Rp',
    MYR: 'RM',
    SGD: 'S$',
    HKD: 'HK$',
    TWD: 'NT$',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
    CHF: 'CHF',
    AED: 'د.إ',
    SAR: '﷼',
    TRY: '₺',
    BRL: 'R$',
    MXN: 'Mex$',
    RUB: '₽',
  };

  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: upper,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === 'currency')?.value?.trim();
    if (symbol && symbol !== upper) {
      return symbol;
    }
  } catch {
    // Unknown ISO code — use fallback map.
  }

  return fallback[upper] ?? upper;
}

/** e.g. "₱ PHP" for compact UI labels. */
export function formatCurrencyWithSymbol(code: string): string {
  const upper = code.trim().toUpperCase() || 'USD';
  const symbol = getCurrencySymbol(upper);
  if (!symbol || symbol === upper) {
    return upper;
  }
  return `${symbol} ${upper}`;
}

export function searchFxCurrencies(query: string, limit = 20): FxCurrencyOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return FX_CURRENCY_OPTIONS.slice(0, limit);
  }

  const scored = FX_CURRENCY_OPTIONS.map((item) => {
    const haystack = [
      item.code,
      item.currencyName,
      item.country,
      ...(item.aliases ?? []),
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    if (item.code.toLowerCase() === q) score = 100;
    else if (item.country.toLowerCase().startsWith(q)) score = 90;
    else if (item.currencyName.toLowerCase().startsWith(q)) score = 80;
    else if (item.code.toLowerCase().startsWith(q)) score = 75;
    else if (haystack.includes(q)) score = 50;
    else return null;

    return { item, score };
  }).filter(Boolean) as Array<{ item: FxCurrencyOption; score: number }>;

  return scored
    .sort((a, b) => b.score - a.score || a.item.country.localeCompare(b.item.country))
    .slice(0, limit)
    .map((row) => row.item);
}

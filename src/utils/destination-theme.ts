import { theme as baseTheme, travelGradients, type ThemeColors } from '@/config/theme';
import { COUNTRIES } from '@/constants/preferences';

export type DestinationThemeId =
  | 'default'
  | 'philippines'
  | 'japan'
  | 'korea'
  | 'china'
  | 'taiwan'
  | 'thailand'
  | 'singapore'
  | 'malaysia'
  | 'hongkong'
  | 'vietnam'
  | 'indonesia'
  | 'cambodia'
  | 'india'
  | 'france'
  | 'germany'
  | 'spain'
  | 'italy'
  | 'uk'
  | 'ireland'
  | 'nordic'
  | 'eastern_europe'
  | 'greece'
  | 'usa'
  | 'canada'
  | 'mexico'
  | 'brazil'
  | 'latam'
  | 'australia'
  | 'newzealand'
  | 'uae'
  | 'saudi'
  | 'turkey'
  | 'egypt'
  | 'africa'
  | 'russia';

type Scheme = 'light' | 'dark';

type GradientStops = readonly [string, string, string, string];

export type BrandScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type AccentScale = {
  300: string;
  400: string;
  500: string;
  600: string;
  soft: string;
};

export type CountryThemeDefinition = {
  id: DestinationThemeId;
  label: string;
  brand: BrandScale;
  accent: AccentScale;
  colors: Record<Scheme, ThemeColors>;
  gradient: Record<Scheme, GradientStops>;
};

function buildColors(
  scheme: Scheme,
  primary: string,
  accent: string,
  background: string,
  surface: string,
  text: string,
  textMuted: string,
  border: string,
): ThemeColors {
  return {
    ...baseTheme[scheme],
    background,
    surface,
    text,
    textMuted,
    border,
    primary,
    primarySoft: scheme === 'dark' ? '#0A3F3B' : '#D7F3EF',
    accent,
    accentSoft: scheme === 'dark' ? '#3A221C' : '#FFE6DF',
    tabIconSelected: primary,
  };
}

function brandFrom(primary600: string, primary400: string, primary800: string): BrandScale {
  return {
    50: '#E8F4F2',
    100: '#D0E8E4',
    200: '#A8D4CE',
    300: '#6BB8AE',
    400: primary400,
    500: primary600,
    600: primary600,
    700: primary800,
    800: primary800,
    900: '#0A1F1C',
  };
}

/** Curated travel palettes — used by ISO country map below. */
export const COUNTRY_THEMES: Record<DestinationThemeId, CountryThemeDefinition> = {
  default: {
    id: 'default',
    label: 'Casual',
    brand: brandFrom('#0A7C74', '#2FCFC2', '#0A4A46'),
    accent: { 300: '#FF9B82', 400: '#FF8A6A', 500: '#FF6B4A', 600: '#E85433', soft: '#FFE6DF' },
    colors: {
      light: baseTheme.light,
      dark: baseTheme.dark,
    },
    gradient: {
      light: travelGradients.light,
      dark: travelGradients.dark,
    },
  },
  philippines: {
    id: 'philippines',
    label: 'Philippines',
    brand: brandFrom('#0B8F7A', '#2BB8A0', '#045C54'),
    accent: { 300: '#F5B87A', 400: '#F0A05A', 500: '#E08A3A', 600: '#C45C26', soft: '#FFF0E0' },
    colors: {
      light: buildColors('light', '#0B8F7A', '#E08A3A', '#EEF8F5', '#FFFFFF', '#0C2422', '#4F6B67', '#C5E8DF'),
      dark: buildColors('dark', '#2BB8A0', '#F0A05A', '#022E2A', '#0A3A34', '#E8F5F2', '#9BB5B0', '#1A4540'),
    },
    gradient: {
      light: ['#045C54', '#0B8F7A', '#2BB8A0', '#F0A05A'],
      dark: ['#022E2A', '#0A4F46', '#0F7A68', '#B86A3A'],
    },
  },
  japan: {
    id: 'japan',
    label: 'Japan',
    brand: brandFrom('#2F4A7A', '#6B8CBC', '#1A2744'),
    accent: { 300: '#F0B8C4', 400: '#E8A0B0', 500: '#D47890', 600: '#B85C74', soft: '#FCE8EE' },
    colors: {
      light: buildColors('light', '#2F4A7A', '#D47890', '#F2F4F8', '#FFFFFF', '#121826', '#5A6578', '#D2DAE8'),
      dark: buildColors('dark', '#6B8CBC', '#E8A0B0', '#0B1220', '#1A2A4A', '#E8EEF8', '#9AA8C0', '#2A3A58'),
    },
    gradient: {
      light: ['#1A2744', '#2F4A7A', '#6B8CBC', '#E8A0B0'],
      dark: ['#0B1220', '#1A2A4A', '#3A4F78', '#A85C6E'],
    },
  },
  korea: {
    id: 'korea',
    label: 'South Korea',
    brand: brandFrom('#1F4B7A', '#4A7FB5', '#14233A'),
    accent: { 300: '#F0A090', 400: '#E07A6A', 500: '#C85A4A', 600: '#A84838', soft: '#FCE8E4' },
    colors: {
      light: buildColors('light', '#1F4B7A', '#C85A4A', '#F0F4F8', '#FFFFFF', '#121820', '#5A6878', '#D0DCE8'),
      dark: buildColors('dark', '#4A7FB5', '#E07A6A', '#0A1422', '#132A48', '#E8F0F8', '#9AADC0', '#1E3A58'),
    },
    gradient: {
      light: ['#14233A', '#1F4B7A', '#4A7FB5', '#E07A6A'],
      dark: ['#0A1422', '#132A48', '#2A5578', '#A85A50'],
    },
  },
  china: {
    id: 'china',
    label: 'China',
    brand: brandFrom('#8B1E2D', '#C94A4A', '#4A1018'),
    accent: { 300: '#F0D080', 400: '#E0B040', 500: '#C99820', 600: '#A87818', soft: '#FFF6E0' },
    colors: {
      light: buildColors('light', '#8B1E2D', '#C99820', '#F8F2F0', '#FFFFFF', '#1A1010', '#6A5050', '#E8D4D0'),
      dark: buildColors('dark', '#C94A4A', '#E0B040', '#1A080C', '#3A1520', '#F8E8E8', '#C0A0A0', '#4A2028'),
    },
    gradient: {
      light: ['#4A1018', '#8B1E2D', '#C94A4A', '#E0B040'],
      dark: ['#1A080C', '#3A1520', '#6A2830', '#A87818'],
    },
  },
  taiwan: {
    id: 'taiwan',
    label: 'Taiwan',
    brand: brandFrom('#1E4A8C', '#4A7AC8', '#0E2858'),
    accent: { 300: '#F08080', 400: '#E06060', 500: '#C04040', 600: '#A03030', soft: '#FCE8E8' },
    colors: {
      light: buildColors('light', '#1E4A8C', '#C04040', '#F0F4FA', '#FFFFFF', '#101828', '#586878', '#D0DCEC'),
      dark: buildColors('dark', '#4A7AC8', '#E06060', '#0A1428', '#142848', '#E8F0FA', '#A0B0C8', '#1E3A60'),
    },
    gradient: {
      light: ['#0E2858', '#1E4A8C', '#4A7AC8', '#E06060'],
      dark: ['#0A1428', '#142848', '#2A4A78', '#A04040'],
    },
  },
  thailand: {
    id: 'thailand',
    label: 'Thailand',
    brand: brandFrom('#1A7A5C', '#3AA880', '#0B4F45'),
    accent: { 300: '#E0C050', 400: '#C9A227', 500: '#B89020', 600: '#9A7818', soft: '#FFF8E0' },
    colors: {
      light: buildColors('light', '#1A7A5C', '#B89020', '#F2F8F4', '#FFFFFF', '#0C2418', '#4F6B58', '#C8E0D4'),
      dark: buildColors('dark', '#3AA880', '#C9A227', '#062A26', '#0E4A3A', '#E8F5EE', '#9BB5A8', '#1A5040'),
    },
    gradient: {
      light: ['#0B4F45', '#1A7A5C', '#C9A227', '#E07A3A'],
      dark: ['#062A26', '#0E4A3A', '#8A6E1C', '#A85A2A'],
    },
  },
  singapore: {
    id: 'singapore',
    label: 'Singapore',
    brand: brandFrom('#1A7A8C', '#3AA8B8', '#0A4A5C'),
    accent: { 300: '#F09070', 400: '#E07A50', 500: '#C86040', 600: '#A84830', soft: '#FCE8E0' },
    colors: {
      light: buildColors('light', '#1A7A8C', '#C86040', '#F0F7F8', '#FFFFFF', '#0C2024', '#4F6870', '#C5DCE0'),
      dark: buildColors('dark', '#3AA8B8', '#E07A50', '#062430', '#0C4550', '#E8F4F6', '#9BB5B8', '#1A5058'),
    },
    gradient: {
      light: ['#0A4A5C', '#1A7A8C', '#3AA8B8', '#E07A50'],
      dark: ['#062430', '#0C4550', '#1A6A78', '#A85A3A'],
    },
  },
  malaysia: {
    id: 'malaysia',
    label: 'Malaysia',
    brand: brandFrom('#0A6A4A', '#2A9A70', '#063828'),
    accent: { 300: '#F0B060', 400: '#E09040', 500: '#C07030', 600: '#A05828', soft: '#FFF0E0' },
    colors: {
      light: buildColors('light', '#0A6A4A', '#C07030', '#F0F8F4', '#FFFFFF', '#0C2018', '#4F6B5C', '#C5E0D4'),
      dark: buildColors('dark', '#2A9A70', '#E09040', '#041C14', '#0A3828', '#E8F5EE', '#9BB5A8', '#1A4838'),
    },
    gradient: {
      light: ['#063828', '#0A6A4A', '#2A9A70', '#E09040'],
      dark: ['#041C14', '#0A3828', '#1A5A40', '#A06830'],
    },
  },
  hongkong: {
    id: 'hongkong',
    label: 'Hong Kong',
    brand: brandFrom('#1A3A6A', '#2A5A9A', '#0C1A3A'),
    accent: { 300: '#F08090', 400: '#E05A6A', 500: '#C04050', 600: '#A03040', soft: '#FCE8EC' },
    colors: {
      light: buildColors('light', '#1A3A6A', '#C04050', '#F2F4F8', '#FFFFFF', '#101828', '#586878', '#D0D8E8'),
      dark: buildColors('dark', '#2A5A9A', '#E05A6A', '#060E22', '#122448', '#E8EEF8', '#A0AEC8', '#1E3A6A'),
    },
    gradient: {
      light: ['#0C1A3A', '#1A3A6A', '#2A5A9A', '#E05A6A'],
      dark: ['#060E22', '#122448', '#1E3A6A', '#A84050'],
    },
  },
  vietnam: {
    id: 'vietnam',
    label: 'Vietnam',
    brand: brandFrom('#1A7A50', '#3AA870', '#0A4A3A'),
    accent: { 300: '#E0C040', 400: '#C9A020', 500: '#B08818', 600: '#907014', soft: '#FFF8DC' },
    colors: {
      light: buildColors('light', '#1A7A50', '#B08818', '#F2F8F2', '#FFFFFF', '#0C2418', '#4F6B58', '#C8E0D0'),
      dark: buildColors('dark', '#3AA870', '#C9A020', '#062820', '#0C4830', '#E8F5EE', '#9BB5A8', '#1A5038'),
    },
    gradient: {
      light: ['#0A4A3A', '#1A7A50', '#C9A020', '#E07040'],
      dark: ['#062820', '#0C4830', '#8A7018', '#A85030'],
    },
  },
  indonesia: {
    id: 'indonesia',
    label: 'Indonesia',
    brand: brandFrom('#1A6A7A', '#2A9A8A', '#0A3A4A'),
    accent: { 300: '#F0A070', 400: '#E08050', 500: '#C86840', 600: '#A85030', soft: '#FCE8E0' },
    colors: {
      light: buildColors('light', '#1A6A7A', '#C86840', '#F0F6F6', '#FFFFFF', '#0C2024', '#4F6870', '#C5D8DC'),
      dark: buildColors('dark', '#2A9A8A', '#E08050', '#061E28', '#0C3A48', '#E8F4F4', '#9BB5B0', '#1A4850'),
    },
    gradient: {
      light: ['#0A3A4A', '#1A6A7A', '#2A9A8A', '#E08050'],
      dark: ['#061E28', '#0C3A48', '#1A5A50', '#A85838'],
    },
  },
  cambodia: {
    id: 'cambodia',
    label: 'Cambodia',
    brand: brandFrom('#6A3A28', '#A06040', '#3A2018'),
    accent: { 300: '#F0C870', 400: '#E0A840', 500: '#C89030', 600: '#A87828', soft: '#FFF6E0' },
    colors: {
      light: buildColors('light', '#6A3A28', '#C89030', '#F8F4F0', '#FFFFFF', '#1A1410', '#6A5850', '#E0D4C8'),
      dark: buildColors('dark', '#A06040', '#E0A840', '#1A100C', '#3A2418', '#F0E8E0', '#C0B0A0', '#4A3020'),
    },
    gradient: {
      light: ['#3A2018', '#6A3A28', '#A06040', '#E0A840'],
      dark: ['#1A100C', '#3A2418', '#5A3830', '#A87828'],
    },
  },
  india: {
    id: 'india',
    label: 'India',
    brand: brandFrom('#C45C14', '#E08040', '#6A3010'),
    accent: { 300: '#90D070', 400: '#60B040', 500: '#3A9020', 600: '#2A7018', soft: '#E8F8E0' },
    colors: {
      light: buildColors('light', '#C45C14', '#3A9020', '#FFF8F0', '#FFFFFF', '#1A140C', '#6A5848', '#E8D8C8'),
      dark: buildColors('dark', '#E08040', '#60B040', '#1A1008', '#3A2410', '#F8F0E8', '#C0B098', '#4A3018'),
    },
    gradient: {
      light: ['#6A3010', '#C45C14', '#E08040', '#60B040'],
      dark: ['#1A1008', '#3A2410', '#8A4818', '#3A7020'],
    },
  },
  france: {
    id: 'france',
    label: 'France',
    brand: brandFrom('#3A6A9A', '#7AA0C8', '#1A3A5C'),
    accent: { 300: '#E0C090', 400: '#D4A574', 500: '#C09050', 600: '#A07840', soft: '#FFF4E8' },
    colors: {
      light: buildColors('light', '#3A6A9A', '#C09050', '#F4F6FA', '#FFFFFF', '#121820', '#586878', '#D4DCE8'),
      dark: buildColors('dark', '#7AA0C8', '#D4A574', '#0C1E30', '#1A3A58', '#E8EEF5', '#A0B0C0', '#2A4A68'),
    },
    gradient: {
      light: ['#1A3A5C', '#3A6A9A', '#7AA0C8', '#D4A574'],
      dark: ['#0C1E30', '#1A3A58', '#3A5A7A', '#A87850'],
    },
  },
  germany: {
    id: 'germany',
    label: 'Germany',
    brand: brandFrom('#2A3A48', '#5A7080', '#141C24'),
    accent: { 300: '#F0C040', 400: '#E0A820', 500: '#C09018', 600: '#A07814', soft: '#FFF8E0' },
    colors: {
      light: buildColors('light', '#2A3A48', '#C09018', '#F4F4F4', '#FFFFFF', '#121418', '#5A6068', '#D8DCE0'),
      dark: buildColors('dark', '#5A7080', '#E0A820', '#0C1014', '#1A242C', '#E8ECF0', '#A0A8B0', '#2A3840'),
    },
    gradient: {
      light: ['#141C24', '#2A3A48', '#5A7080', '#E0A820'],
      dark: ['#0C1014', '#1A242C', '#3A4850', '#A07814'],
    },
  },
  spain: {
    id: 'spain',
    label: 'Spain',
    brand: brandFrom('#A02828', '#D05050', '#501414'),
    accent: { 300: '#F0C050', 400: '#E0A020', 500: '#C88818', 600: '#A87014', soft: '#FFF6E0' },
    colors: {
      light: buildColors('light', '#A02828', '#C88818', '#FAF4F0', '#FFFFFF', '#1A1010', '#6A5050', '#E8D4D0'),
      dark: buildColors('dark', '#D05050', '#E0A020', '#1A0808', '#3A1818', '#F8E8E8', '#C0A0A0', '#4A2020'),
    },
    gradient: {
      light: ['#501414', '#A02828', '#D05050', '#E0A020'],
      dark: ['#1A0808', '#3A1818', '#6A2828', '#A87014'],
    },
  },
  italy: {
    id: 'italy',
    label: 'Italy',
    brand: brandFrom('#3A6A4A', '#7AA868', '#1A3A2A'),
    accent: { 300: '#E0B080', 400: '#D49060', 500: '#C07848', 600: '#A06038', soft: '#FFF0E4' },
    colors: {
      light: buildColors('light', '#3A6A4A', '#C07848', '#F4F8F4', '#FFFFFF', '#121A14', '#586858', '#D0E0D4'),
      dark: buildColors('dark', '#7AA868', '#D49060', '#0C1E18', '#1A3A28', '#E8F0E8', '#A0B8A8', '#2A4A38'),
    },
    gradient: {
      light: ['#1A3A2A', '#3A6A4A', '#7AA868', '#D49060'],
      dark: ['#0C1E18', '#1A3A28', '#3A5A38', '#A87048'],
    },
  },
  uk: {
    id: 'uk',
    label: 'United Kingdom',
    brand: brandFrom('#3A5A68', '#6A8A90', '#1E3340'),
    accent: { 300: '#C89878', 400: '#A87858', 500: '#906848', 600: '#785838', soft: '#F4E8E0' },
    colors: {
      light: buildColors('light', '#3A5A68', '#906848', '#F2F4F4', '#FFFFFF', '#14181A', '#586468', '#D4DCDE'),
      dark: buildColors('dark', '#6A8A90', '#A87858', '#0E1A22', '#1E3440', '#E8EEF0', '#A0B0B4', '#2A4450'),
    },
    gradient: {
      light: ['#1E3340', '#3A5A68', '#6A8A90', '#A87858'],
      dark: ['#0E1A22', '#1E3440', '#3A5460', '#7A5840'],
    },
  },
  ireland: {
    id: 'ireland',
    label: 'Ireland',
    brand: brandFrom('#2A6A3A', '#4A9A58', '#143820'),
    accent: { 300: '#F0B060', 400: '#E09040', 500: '#C87830', 600: '#A86028', soft: '#FFF0E0' },
    colors: {
      light: buildColors('light', '#2A6A3A', '#C87830', '#F2F8F2', '#FFFFFF', '#101810', '#586858', '#D0E0D4'),
      dark: buildColors('dark', '#4A9A58', '#E09040', '#0A1A10', '#1A3820', '#E8F4E8', '#A0B8A8', '#2A4830'),
    },
    gradient: {
      light: ['#143820', '#2A6A3A', '#4A9A58', '#E09040'],
      dark: ['#0A1A10', '#1A3820', '#2A5838', '#A86028'],
    },
  },
  nordic: {
    id: 'nordic',
    label: 'Nordic',
    brand: brandFrom('#3A6A8A', '#6A9AB8', '#1A3A50'),
    accent: { 300: '#A0D0E0', 400: '#70B0C8', 500: '#5090B0', 600: '#387898', soft: '#E8F4F8' },
    colors: {
      light: buildColors('light', '#3A6A8A', '#5090B0', '#F2F6F8', '#FFFFFF', '#12181C', '#586870', '#D0DCE4'),
      dark: buildColors('dark', '#6A9AB8', '#70B0C8', '#0A141C', '#1A3040', '#E8F0F4', '#A0B8C4', '#2A4858'),
    },
    gradient: {
      light: ['#1A3A50', '#3A6A8A', '#6A9AB8', '#A0D0E0'],
      dark: ['#0A141C', '#1A3040', '#2A5068', '#387898'],
    },
  },
  eastern_europe: {
    id: 'eastern_europe',
    label: 'Eastern Europe',
    brand: brandFrom('#4A3A6A', '#7A6A9A', '#241A38'),
    accent: { 300: '#E0A070', 400: '#D08050', 500: '#B86840', 600: '#985030', soft: '#FCE8E0' },
    colors: {
      light: buildColors('light', '#4A3A6A', '#B86840', '#F6F4F8', '#FFFFFF', '#16121A', '#605868', '#DCD4E4'),
      dark: buildColors('dark', '#7A6A9A', '#D08050', '#100C18', '#241A38', '#F0E8F4', '#B8A8C8', '#3A2A50'),
    },
    gradient: {
      light: ['#241A38', '#4A3A6A', '#7A6A9A', '#D08050'],
      dark: ['#100C18', '#241A38', '#3A2A50', '#985030'],
    },
  },
  greece: {
    id: 'greece',
    label: 'Greece',
    brand: brandFrom('#1A5A9A', '#4A8AC8', '#0E2A50'),
    accent: { 300: '#F0E8C0', 400: '#E0D090', 500: '#C8B870', 600: '#A89858', soft: '#FFFCE8' },
    colors: {
      light: buildColors('light', '#1A5A9A', '#C8B870', '#F4F8FC', '#FFFFFF', '#101820', '#586878', '#D0DCEC'),
      dark: buildColors('dark', '#4A8AC8', '#E0D090', '#081420', '#143048', '#E8F0F8', '#A0B8D0', '#1E4870'),
    },
    gradient: {
      light: ['#0E2A50', '#1A5A9A', '#4A8AC8', '#E0D090'],
      dark: ['#081420', '#143048', '#2A5880', '#A89858'],
    },
  },
  usa: {
    id: 'usa',
    label: 'United States',
    brand: brandFrom('#1A6A9A', '#4A9AC8', '#0E3A5C'),
    accent: { 300: '#F0A060', 400: '#E08A40', 500: '#C87030', 600: '#A85828', soft: '#FFF0E4' },
    colors: {
      light: buildColors('light', '#1A6A9A', '#C87030', '#F0F6FA', '#FFFFFF', '#0C1820', '#4F6878', '#C8DCE8'),
      dark: buildColors('dark', '#4A9AC8', '#E08A40', '#061E30', '#0E3A58', '#E8F2F8', '#9BB5C8', '#1A5A78'),
    },
    gradient: {
      light: ['#0E3A5C', '#1A6A9A', '#4A9AC8', '#E08A40'],
      dark: ['#061E30', '#0E3A58', '#1A5A78', '#A86030'],
    },
  },
  canada: {
    id: 'canada',
    label: 'Canada',
    brand: brandFrom('#A02828', '#D05050', '#501414'),
    accent: { 300: '#90C8E0', 400: '#60A8C8', 500: '#4088B0', 600: '#306890', soft: '#E8F4FA' },
    colors: {
      light: buildColors('light', '#A02828', '#4088B0', '#FAF4F4', '#FFFFFF', '#1A1010', '#6A5050', '#E8D4D4'),
      dark: buildColors('dark', '#D05050', '#60A8C8', '#1A0808', '#3A1818', '#F8E8E8', '#C0A0A0', '#4A2020'),
    },
    gradient: {
      light: ['#501414', '#A02828', '#D05050', '#60A8C8'],
      dark: ['#1A0808', '#3A1818', '#6A2828', '#306890'],
    },
  },
  mexico: {
    id: 'mexico',
    label: 'Mexico',
    brand: brandFrom('#1A6A3A', '#3A9A58', '#0E3820'),
    accent: { 300: '#F0A050', 400: '#E08030', 500: '#C86820', 600: '#A85018', soft: '#FFF0E0' },
    colors: {
      light: buildColors('light', '#1A6A3A', '#C86820', '#F4F8F2', '#FFFFFF', '#101810', '#586858', '#D0E0D0'),
      dark: buildColors('dark', '#3A9A58', '#E08030', '#0A1810', '#1A3820', '#E8F4E8', '#A0B8A0', '#2A4830'),
    },
    gradient: {
      light: ['#0E3820', '#1A6A3A', '#3A9A58', '#E08030'],
      dark: ['#0A1810', '#1A3820', '#2A5838', '#A85018'],
    },
  },
  brazil: {
    id: 'brazil',
    label: 'Brazil',
    brand: brandFrom('#1A7A3A', '#3AAA58', '#0E4020'),
    accent: { 300: '#F0D050', 400: '#E0B020', 500: '#C89818', 600: '#A88014', soft: '#FFF8E0' },
    colors: {
      light: buildColors('light', '#1A7A3A', '#C89818', '#F2F8F2', '#FFFFFF', '#101810', '#586858', '#D0E0D0'),
      dark: buildColors('dark', '#3AAA58', '#E0B020', '#0A1C10', '#1A3A20', '#E8F4E8', '#A0B8A0', '#2A5030'),
    },
    gradient: {
      light: ['#0E4020', '#1A7A3A', '#3AAA58', '#E0B020'],
      dark: ['#0A1C10', '#1A3A20', '#2A5A38', '#A88014'],
    },
  },
  latam: {
    id: 'latam',
    label: 'Latin America',
    brand: brandFrom('#8A3A28', '#C06040', '#4A2018'),
    accent: { 300: '#F0C060', 400: '#E0A040', 500: '#C88830', 600: '#A87028', soft: '#FFF4E0' },
    colors: {
      light: buildColors('light', '#8A3A28', '#C88830', '#FAF6F2', '#FFFFFF', '#1A1410', '#6A5850', '#E4D8D0'),
      dark: buildColors('dark', '#C06040', '#E0A040', '#1A100C', '#3A2018', '#F0E8E0', '#C0B0A0', '#4A3020'),
    },
    gradient: {
      light: ['#4A2018', '#8A3A28', '#C06040', '#E0A040'],
      dark: ['#1A100C', '#3A2018', '#5A3028', '#A87028'],
    },
  },
  australia: {
    id: 'australia',
    label: 'Australia',
    brand: brandFrom('#1A7A8A', '#3AA8A0', '#0A4A5A'),
    accent: { 300: '#F0C060', 400: '#E0A040', 500: '#C88830', 600: '#A87028', soft: '#FFF4E0' },
    colors: {
      light: buildColors('light', '#1A7A8A', '#C88830', '#F0F7F6', '#FFFFFF', '#0C2024', '#4F6870', '#C5DCE0'),
      dark: buildColors('dark', '#3AA8A0', '#E0A040', '#062830', '#0C4850', '#E8F4F4', '#9BB5B0', '#1A6A68'),
    },
    gradient: {
      light: ['#0A4A5A', '#1A7A8A', '#3AA8A0', '#E0A040'],
      dark: ['#062830', '#0C4850', '#1A6A68', '#A87830'],
    },
  },
  newzealand: {
    id: 'newzealand',
    label: 'New Zealand',
    brand: brandFrom('#1A4A6A', '#3A7A9A', '#0E2840'),
    accent: { 300: '#90D080', 400: '#60B050', 500: '#409038', 600: '#307028', soft: '#E8F8E4' },
    colors: {
      light: buildColors('light', '#1A4A6A', '#409038', '#F0F6F8', '#FFFFFF', '#101820', '#586878', '#D0DCE4'),
      dark: buildColors('dark', '#3A7A9A', '#60B050', '#081420', '#142838', '#E8F0F4', '#A0B8C4', '#1E4860'),
    },
    gradient: {
      light: ['#0E2840', '#1A4A6A', '#3A7A9A', '#60B050'],
      dark: ['#081420', '#142838', '#2A5070', '#307028'],
    },
  },
  uae: {
    id: 'uae',
    label: 'United Arab Emirates',
    brand: brandFrom('#2A4A5A', '#4A7A8A', '#1A2A3A'),
    accent: { 300: '#E0C060', 400: '#C9A040', 500: '#B08830', 600: '#907028', soft: '#FFF6E0' },
    colors: {
      light: buildColors('light', '#2A4A5A', '#B08830', '#F6F4F0', '#FFFFFF', '#14181A', '#5A6058', '#DCD8D0'),
      dark: buildColors('dark', '#4A7A8A', '#C9A040', '#0C141C', '#1A2A38', '#F0ECE4', '#B8B0A0', '#2A3A48'),
    },
    gradient: {
      light: ['#1A2A3A', '#2A4A5A', '#C9A040', '#E07040'],
      dark: ['#0C141C', '#1A2A38', '#8A6E28', '#A85030'],
    },
  },
  saudi: {
    id: 'saudi',
    label: 'Saudi Arabia',
    brand: brandFrom('#0A5A3A', '#2A8A58', '#043020'),
    accent: { 300: '#E0C870', 400: '#D0A840', 500: '#B89030', 600: '#987828', soft: '#FFF8E0' },
    colors: {
      light: buildColors('light', '#0A5A3A', '#B89030', '#F4F8F4', '#FFFFFF', '#0C1810', '#4F6858', '#C8E0D4'),
      dark: buildColors('dark', '#2A8A58', '#D0A840', '#041810', '#0A3020', '#E8F4EC', '#A0B8A8', '#1A4830'),
    },
    gradient: {
      light: ['#043020', '#0A5A3A', '#2A8A58', '#D0A840'],
      dark: ['#041810', '#0A3020', '#1A5038', '#987828'],
    },
  },
  turkey: {
    id: 'turkey',
    label: 'Turkey',
    brand: brandFrom('#8A1E28', '#C04050', '#4A1018'),
    accent: { 300: '#F0D080', 400: '#E0B040', 500: '#C89830', 600: '#A88028', soft: '#FFF6E0' },
    colors: {
      light: buildColors('light', '#8A1E28', '#C89830', '#FAF4F2', '#FFFFFF', '#1A1010', '#6A5050', '#E8D4D0'),
      dark: buildColors('dark', '#C04050', '#E0B040', '#1A080C', '#3A1520', '#F8E8E8', '#C0A0A0', '#4A2028'),
    },
    gradient: {
      light: ['#4A1018', '#8A1E28', '#C04050', '#E0B040'],
      dark: ['#1A080C', '#3A1520', '#6A2830', '#A88028'],
    },
  },
  egypt: {
    id: 'egypt',
    label: 'Egypt',
    brand: brandFrom('#8A6A28', '#C0A040', '#4A3814'),
    accent: { 300: '#90C0E0', 400: '#60A0C8', 500: '#4080B0', 600: '#306890', soft: '#E8F4FA' },
    colors: {
      light: buildColors('light', '#8A6A28', '#4080B0', '#FAF6EE', '#FFFFFF', '#1A1810', '#6A6450', '#E4DCC8'),
      dark: buildColors('dark', '#C0A040', '#60A0C8', '#1A1408', '#3A2C14', '#F0E8D8', '#C0B898', '#4A3C20'),
    },
    gradient: {
      light: ['#4A3814', '#8A6A28', '#C0A040', '#60A0C8'],
      dark: ['#1A1408', '#3A2C14', '#6A5020', '#306890'],
    },
  },
  africa: {
    id: 'africa',
    label: 'Africa',
    brand: brandFrom('#6A4A20', '#9A7040', '#3A2810'),
    accent: { 300: '#F0A050', 400: '#E08030', 500: '#C86820', 600: '#A85018', soft: '#FFF0E0' },
    colors: {
      light: buildColors('light', '#6A4A20', '#C86820', '#FAF6F0', '#FFFFFF', '#1A1410', '#6A5848', '#E4D8C8'),
      dark: buildColors('dark', '#9A7040', '#E08030', '#141008', '#2A2010', '#F0E8DC', '#C0B098', '#403018'),
    },
    gradient: {
      light: ['#3A2810', '#6A4A20', '#9A7040', '#E08030'],
      dark: ['#141008', '#2A2010', '#4A3820', '#A85018'],
    },
  },
  russia: {
    id: 'russia',
    label: 'Russia',
    brand: brandFrom('#1A3A6A', '#3A6A9A', '#0E2040'),
    accent: { 300: '#F08080', 400: '#E05050', 500: '#C03030', 600: '#A02828', soft: '#FCE8E8' },
    colors: {
      light: buildColors('light', '#1A3A6A', '#C03030', '#F2F4F8', '#FFFFFF', '#101820', '#586878', '#D0D8E8'),
      dark: buildColors('dark', '#3A6A9A', '#E05050', '#080E1C', '#142848', '#E8EEF8', '#A0AEC8', '#1E3A60'),
    },
    gradient: {
      light: ['#0E2040', '#1A3A6A', '#3A6A9A', '#E05050'],
      dark: ['#080E1C', '#142848', '#2A4A78', '#A02828'],
    },
  },
};

/** ISO code → curated theme for every country in the app country list. */
export const COUNTRY_CODE_THEME: Record<string, DestinationThemeId> = {
  PH: 'philippines',
  JP: 'japan',
  KR: 'korea',
  CN: 'china',
  TW: 'taiwan',
  HK: 'hongkong',
  MO: 'hongkong',
  TH: 'thailand',
  SG: 'singapore',
  MY: 'malaysia',
  VN: 'vietnam',
  ID: 'indonesia',
  KH: 'cambodia',
  LA: 'vietnam',
  MM: 'cambodia',
  IN: 'india',
  PK: 'india',
  BD: 'india',
  LK: 'india',
  NP: 'india',
  FR: 'france',
  DE: 'germany',
  ES: 'spain',
  IT: 'italy',
  PT: 'spain',
  NL: 'nordic',
  BE: 'france',
  AT: 'germany',
  CH: 'germany',
  IE: 'ireland',
  GB: 'uk',
  SE: 'nordic',
  NO: 'nordic',
  DK: 'nordic',
  FI: 'nordic',
  IS: 'nordic',
  PL: 'eastern_europe',
  CZ: 'eastern_europe',
  HU: 'eastern_europe',
  RO: 'eastern_europe',
  BG: 'eastern_europe',
  HR: 'eastern_europe',
  RS: 'eastern_europe',
  GR: 'greece',
  US: 'usa',
  CA: 'canada',
  MX: 'mexico',
  BR: 'brazil',
  AR: 'latam',
  CL: 'latam',
  CO: 'latam',
  PE: 'latam',
  AU: 'australia',
  NZ: 'newzealand',
  AE: 'uae',
  SA: 'saudi',
  QA: 'uae',
  KW: 'uae',
  BH: 'uae',
  OM: 'uae',
  JO: 'egypt',
  IL: 'egypt',
  TR: 'turkey',
  EG: 'egypt',
  ZA: 'africa',
  NG: 'africa',
  KE: 'africa',
  RU: 'russia',
  UA: 'eastern_europe',
};

const CITY_ALIASES: Array<{ id: DestinationThemeId; match: RegExp }> = [
  {
    id: 'philippines',
    match: /\b(philippines|pilipinas|manila|cebu|davao|bulacan|malolos|quezon|makati|taguig|pasig)\b/i,
  },
  {
    id: 'japan',
    match: /\b(japan|nippon|tokyo|osaka|kyoto|hokkaido|okinawa|nagoya|fukuoka|yokohama|sapporo)\b/i,
  },
  { id: 'korea', match: /\b(korea|seoul|busan|incheon|jeju)\b/i },
  { id: 'china', match: /\b(china|beijing|shanghai|guangzhou|shenzhen|chengdu)\b/i },
  { id: 'taiwan', match: /\b(taiwan|taipei|kaohsiung)\b/i },
  { id: 'hongkong', match: /\b(hong kong|hongkong)\b/i },
  { id: 'thailand', match: /\b(thailand|bangkok|phuket|chiang mai|pattaya)\b/i },
  { id: 'singapore', match: /\b(singapore)\b/i },
  { id: 'malaysia', match: /\b(malaysia|kuala lumpur|penang|langkawi)\b/i },
  { id: 'vietnam', match: /\b(vietnam|hanoi|ho chi minh|da nang|saigon)\b/i },
  { id: 'indonesia', match: /\b(indonesia|bali|jakarta|bandung|surabaya)\b/i },
  { id: 'cambodia', match: /\b(cambodia|siem reap|phnom penh|angkor)\b/i },
  { id: 'india', match: /\b(india|delhi|mumbai|bengaluru|jaipur|goa)\b/i },
  { id: 'france', match: /\b(france|paris|lyon|marseille|nice)\b/i },
  { id: 'germany', match: /\b(germany|berlin|munich|hamburg|frankfurt)\b/i },
  { id: 'spain', match: /\b(spain|madrid|barcelona|seville|valencia)\b/i },
  { id: 'italy', match: /\b(italy|rome|milan|florence|venice)\b/i },
  {
    id: 'uk',
    match: /\b(united kingdom|\buk\b|england|scotland|wales|london|manchester|edinburgh)\b/i,
  },
  { id: 'ireland', match: /\b(ireland|dublin|cork|galway)\b/i },
  { id: 'nordic', match: /\b(sweden|norway|denmark|finland|iceland|stockholm|oslo|copenhagen|helsinki)\b/i },
  { id: 'greece', match: /\b(greece|athens|santorini|mykonos|crete)\b/i },
  {
    id: 'usa',
    match:
      /\b(united states|\busa\b|\bu\.s\.a\b|new york|los angeles|san francisco|chicago|hawaii|miami|seattle)\b/i,
  },
  { id: 'canada', match: /\b(canada|toronto|vancouver|montreal|ottawa)\b/i },
  { id: 'mexico', match: /\b(mexico|cancun|cdmx|guadalajara|tulum)\b/i },
  { id: 'brazil', match: /\b(brazil|rio|sao paulo|salvador)\b/i },
  { id: 'australia', match: /\b(australia|sydney|melbourne|brisbane|perth)\b/i },
  { id: 'newzealand', match: /\b(new zealand|auckland|wellington|queenstown)\b/i },
  { id: 'uae', match: /\b(united arab emirates|\buae\b|dubai|abu dhabi)\b/i },
  { id: 'saudi', match: /\b(saudi|riyadh|jeddah)\b/i },
  { id: 'turkey', match: /\b(turkey|istanbul|ankara|cappadocia)\b/i },
  { id: 'egypt', match: /\b(egypt|cairo|luxor|giza)\b/i },
  { id: 'africa', match: /\b(south africa|kenya|nigeria|cape town|nairobi|lagos)\b/i },
  { id: 'russia', match: /\b(russia|moscow|saint petersburg|st petersburg)\b/i },
];

function normalizeHaystack(...parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();
}

export function resolveDestinationThemeId(
  countryOrLabel?: string | null,
  extraLabel?: string | null,
): DestinationThemeId {
  const hay = normalizeHaystack(countryOrLabel, extraLabel);
  if (!hay) return 'default';

  const asCode = hay.toUpperCase();
  if (COUNTRY_CODE_THEME[asCode]) {
    return COUNTRY_CODE_THEME[asCode];
  }

  // Match ISO from COUNTRIES labels ("Japan", "United States", …).
  for (const country of COUNTRIES) {
    if (hay === country.code.toLowerCase() || hay.includes(country.label.toLowerCase())) {
      return COUNTRY_CODE_THEME[country.code] ?? 'default';
    }
  }

  for (const entry of CITY_ALIASES) {
    if (entry.match.test(hay)) return entry.id;
  }

  return 'default';
}

export function getCountryTheme(
  countryOrLabel?: string | null,
  cityOrLabel?: string | null,
): CountryThemeDefinition {
  const id = resolveDestinationThemeId(countryOrLabel, cityOrLabel);
  return COUNTRY_THEMES[id];
}

/** Home hero gradient for the selected country / city label. */
export function getDestinationTravelGradient(
  scheme: Scheme,
  countryOrLabel?: string | null,
  cityOrLabel?: string | null,
): GradientStops {
  return getCountryTheme(countryOrLabel, cityOrLabel).gradient[scheme];
}

export function getCountryThemeColors(
  scheme: Scheme,
  countryOrLabel?: string | null,
  cityOrLabel?: string | null,
): ThemeColors {
  return getCountryTheme(countryOrLabel, cityOrLabel).colors[scheme];
}

/** Blend `tint` into `base` (amount 0–1 of tint). Used for dark soft fills. */
function mixHex(tint: string, base: string, amount: number): string {
  const parse = (hex: string): [number, number, number] | null => {
    const raw = hex.replace('#', '').trim();
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((c) => c + c)
            .join('')
        : raw;
    if (full.length !== 6 || Number.isNaN(Number.parseInt(full, 16))) return null;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  };
  const a = parse(tint);
  const b = parse(base);
  if (!a || !b) return base;
  const t = Math.min(1, Math.max(0, amount));
  const channel = (from: number, to: number) => Math.round(to + (from - to) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(channel(a[0], b[0]))}${toHex(channel(a[1], b[1]))}${toHex(channel(a[2], b[2]))}`;
}

/** NativeWind CSS variables for brand / accent / surface tokens. */
export function getCountryThemeCssVars(
  scheme: Scheme,
  countryOrLabel?: string | null,
  cityOrLabel?: string | null,
): Record<string, string> {
  const def = getCountryTheme(countryOrLabel, cityOrLabel);
  const colors = def.colors[scheme];
  const { brand, accent } = def;
  return {
    '--color-brand-50': brand[50],
    '--color-brand-100': brand[100],
    '--color-brand-200': brand[200],
    '--color-brand-300': brand[300],
    '--color-brand-400': brand[400],
    '--color-brand-500': brand[500],
    '--color-brand-600': brand[600],
    '--color-brand-700': brand[700],
    '--color-brand-800': brand[800],
    '--color-brand-900': brand[900],
    '--color-accent-300': accent[300],
    '--color-accent-400': accent[400],
    '--color-accent-500': accent[500],
    '--color-accent-600': accent[600],
    // Soft fills are always pastel in theme defs — darken in dark mode so ink stays readable.
    '--color-accent-soft':
      scheme === 'light' ? accent.soft : mixHex(accent[600], colors.surface, 0.22),
    '--color-surface-light': scheme === 'light' ? colors.background : baseTheme.light.background,
    '--color-surface-dark': scheme === 'dark' ? colors.background : baseTheme.dark.background,
    '--color-surface-cardLight': scheme === 'light' ? colors.surface : '#FFFFFF',
    '--color-surface-cardDark': scheme === 'dark' ? colors.surface : baseTheme.dark.surface,
    '--color-surface-mist':
      scheme === 'light' ? colors.primarySoft : mixHex(colors.primary, colors.surface, 0.28),
    '--color-ink-light': scheme === 'light' ? colors.text : baseTheme.light.text,
    '--color-ink-dark': scheme === 'dark' ? colors.text : baseTheme.dark.text,
    '--color-ink-mutedLight': scheme === 'light' ? colors.textMuted : baseTheme.light.textMuted,
    '--color-ink-mutedDark': scheme === 'dark' ? colors.textMuted : baseTheme.dark.textMuted,
  };
}

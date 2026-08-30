import { Country, CountryConfig, COUNTRY_CONFIGS, CountryTrait } from '../../shared';

export class CountryService {
  private static instance: CountryService;

  static getInstance(): CountryService {
    if (!CountryService.instance) {
      CountryService.instance = new CountryService();
    }
    return CountryService.instance;
  }

  getRandomCountry(): Country {
    const countries = Object.values(Country) as Country[];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  getCountryConfig(country: Country): CountryConfig {
    return COUNTRY_CONFIGS[country];
  }

  getCountryTrait(country: Country): CountryTrait {
    return COUNTRY_CONFIGS[country].trait;
  }

  getCountryName(country: Country): string {
    return COUNTRY_CONFIGS[country].name;
  }

  getAllCountries(): Country[] {
    return Object.values(Country) as Country[];
  }

  getCapitalPosition(country: Country): { x: number; y: number } {
    return { ...COUNTRY_CONFIGS[country].capitalPosition };
  }

  getCountryCulture(country: Country): string {
    return COUNTRY_CONFIGS[country].culture;
  }
}
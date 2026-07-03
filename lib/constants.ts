// Registered-account limits, sourced from CRA. Update this file once per year
// when CRA announces new limits (usually mid-November), then bump MAX_SUPPORTED_YEAR.

// Annual TFSA dollar limits by year, per CRA. 2026 limit of $7,000 verified July 2026.
export const TFSA_ANNUAL_LIMITS: Record<number, number> = {
  2009: 5000,
  2010: 5000,
  2011: 5000,
  2012: 5000,
  2013: 5500,
  2014: 5500,
  2015: 10000,
  2016: 5500,
  2017: 5500,
  2018: 5500,
  2019: 6000,
  2020: 6000,
  2021: 6000,
  2022: 6000,
  2023: 6500,
  2024: 7000,
  2025: 7000,
  2026: 7000,
};

export const TFSA_FIRST_YEAR = 2009;

// The last year we have a verified CRA limit for. The app clamps "current year"
// to this value so the math can never silently use a year we have no data for.
export const MAX_SUPPORTED_YEAR = 2026;

export const FHSA_FIRST_YEAR = 2023; // FHSAs became available April 1, 2023
export const FHSA_ANNUAL_LIMIT = 8000;
export const FHSA_LIFETIME_LIMIT = 40000;
export const FHSA_MAX_CARRY_FORWARD = 8000;

export function getCurrentYear(): number {
  return Math.min(new Date().getFullYear(), MAX_SUPPORTED_YEAR);
}

const AMOUNT_DECIMALS = 6;

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: AMOUNT_DECIMALS,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const subCentFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const rateFormatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 6,
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
});

export const formatAmount = (value: number): string =>
  amountFormatter.format(value);

export const formatRate = (value: number): string =>
  rateFormatter.format(value);

export const formatUsd = (value: number): string =>
  value !== 0 && Math.abs(value) < 0.01
    ? subCentFormatter.format(value)
    : usdFormatter.format(value);

export const formatQuotedAt = (isoDate: string): string => {
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? '' : `${timeFormatter.format(parsed)} UTC`;
};

export const sanitiseAmountInput = (raw: string): string => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');

  if (rest.length === 0) return whole;

  return `${whole}.${rest.join('').slice(0, AMOUNT_DECIMALS)}`;
};

export const parseAmount = (raw: string): number => {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toAmountInput = (value: number): string => {
  if (value <= 0) return '';

  const scale = 10 ** AMOUNT_DECIMALS;
  const truncated = Math.floor(value * scale) / scale;
  const fixed = truncated.toFixed(AMOUNT_DECIMALS);

  return fixed.replace(/\.?0+$/, '');
};

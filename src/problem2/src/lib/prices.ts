import type { Token } from '../types';

const PRICES_URL = 'https://interview.switcheo.com/prices.json';

const ICON_SYMBOLS: Record<string, string> = {
  RATOM: 'rATOM',
  STATOM: 'stATOM',
  STEVMOS: 'stEVMOS',
  STLUNA: 'stLUNA',
  STOSMO: 'stOSMO',
};

interface PriceEntry {
  currency: string;
  date: string;
  price: number;
}

const isPriceEntry = (value: unknown): value is PriceEntry => {
  if (typeof value !== 'object' || value === null) return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.currency === 'string' &&
    entry.currency.length > 0 &&
    typeof entry.date === 'string' &&
    typeof entry.price === 'number'
  );
};

const toToken = (entry: PriceEntry): Token => ({
  symbol: entry.currency,
  iconSymbol: ICON_SYMBOLS[entry.currency] ?? entry.currency,
  priceUsd: entry.price,
  quotedAt: entry.date,
});

const parseTokens = (payload: unknown): Token[] => {
  if (!Array.isArray(payload)) {
    throw new Error('The price feed did not return a list of prices.');
  }

  const newest = new Map<string, Token>();

  for (const entry of payload) {
    if (!isPriceEntry(entry)) continue;
    if (!Number.isFinite(entry.price) || entry.price <= 0) continue;

    const held = newest.get(entry.currency);
    if (held && Date.parse(held.quotedAt) > Date.parse(entry.date)) continue;

    newest.set(entry.currency, toToken(entry));
  }

  return [...newest.values()].sort((lhs, rhs) =>
    lhs.symbol.localeCompare(rhs.symbol, 'en', { sensitivity: 'base' }),
  );
};

export const fetchTokens = async (signal: AbortSignal): Promise<Token[]> => {
  const response = await fetch(PRICES_URL, { signal });

  if (!response.ok) {
    throw new Error(`The price feed answered with ${response.status}.`);
  }

  return parseTokens(await response.json());
};

export const tokenIconUrl = (token: Token): string =>
  `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/${token.iconSymbol}.svg`;

const HOLDINGS: Record<string, number> = {
  ETH: 4.2731,
  WBTC: 0.18402,
  ATOM: 512.4066,
  OSMO: 8420.51,
  SWTH: 1250000,
  USDC: 18420.77,
  LUNA: 3105.9,
  KUJI: 744.28,
  STATOM: 96.503,
  GMX: 12.884,
  ZIL: 45210.6,
  bNEO: 88.21,
};

export const SETTLEMENT_DELAY_MS = 1600;

export const balanceOf = (
  balances: Record<string, number>,
  symbol: string,
): number => balances[symbol] ?? 0;

export const initialBalances = (symbols: string[]): Record<string, number> =>
  Object.fromEntries(symbols.map((symbol) => [symbol, HOLDINGS[symbol] ?? 0]));

export const newReference = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

export const applySwap = (
  balances: Record<string, number>,
  paySymbol: string,
  payAmount: number,
  receiveSymbol: string,
  receiveAmount: number,
): Record<string, number> => ({
  ...balances,
  [paySymbol]: balanceOf(balances, paySymbol) - payAmount,
  [receiveSymbol]: balanceOf(balances, receiveSymbol) + receiveAmount,
});

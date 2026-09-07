export interface Token {
  symbol: string;
  iconSymbol: string;
  priceUsd: number;
  quotedAt: string;
}

export type SwapSide = 'pay' | 'receive';

export interface Receipt {
  id: string;
  paySymbol: string;
  payAmount: number;
  receiveSymbol: string;
  receiveAmount: number;
}

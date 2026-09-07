import type { Token } from '../types';
import { formatAmount } from './format';

export interface Quote {
  payAmount: number;
  payValueUsd: number;
  receiveAmount: number;
  rate: number;
}

export type ValidationCode = 'ok' | 'no-amount' | 'insufficient-balance';

export interface Validation {
  code: ValidationCode;
  message: string | null;
}

export const quoteSwap = (
  payToken: Token,
  receiveToken: Token,
  payAmount: number,
): Quote => {
  const rate = payToken.priceUsd / receiveToken.priceUsd;
  const payValueUsd = payAmount * payToken.priceUsd;

  return {
    payAmount,
    payValueUsd,
    receiveAmount: payAmount * rate,
    rate,
  };
};

export const validate = (
  rawAmount: string,
  payAmount: number,
  payToken: Token,
  balance: number,
): Validation => {
  if (!/\d/.test(rawAmount)) {
    return { code: 'no-amount', message: null };
  }

  if (payAmount <= 0) {
    return { code: 'no-amount', message: 'Enter an amount above zero.' };
  }

  if (payAmount > balance) {
    return {
      code: 'insufficient-balance',
      message: `You hold ${balance === 0 ? 'no' : formatAmount(balance)} ${payToken.symbol}.`,
    };
  }

  return { code: 'ok', message: null };
};

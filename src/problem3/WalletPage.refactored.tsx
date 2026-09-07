/*
 * The challenge shows one file with no imports.
 * The modules below are assumed to exist. Only the paths are guesses.
 */

import { useMemo } from 'react';
import type { BoxProps } from '@mui/material';

import { useWalletBalances, usePrices } from './hooks';
import { WalletRow } from './WalletRow';
import classes from './WalletPage.module.css';

type SupportedBlockchain =
  | 'Osmosis'
  | 'Ethereum'
  | 'Arbitrum'
  | 'Zilliqa'
  | 'Neo';

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string;
}

interface WalletRowModel {
  currency: string;
  blockchain: string;
  amount: number;
  formattedAmount: string;
  usdValue: number;
}

const UNSUPPORTED_PRIORITY = -99;

const BLOCKCHAIN_PRIORITY: Record<SupportedBlockchain, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const isSupportedBlockchain = (
  blockchain: string,
): blockchain is SupportedBlockchain =>
  Object.hasOwn(BLOCKCHAIN_PRIORITY, blockchain);

const getPriority = (blockchain: string): number =>
  isSupportedBlockchain(blockchain)
    ? BLOCKCHAIN_PRIORITY[blockchain]
    : UNSUPPORTED_PRIORITY;

export const WalletPage = ({ children, ...rest }: BoxProps) => {
  const balances = useWalletBalances();
  const prices = usePrices();

  const sortedBalances = useMemo(
    () =>
      balances
        .map((balance: WalletBalance) => ({
          balance,
          priority: getPriority(balance.blockchain),
        }))
        .filter(
          ({ balance, priority }) =>
            priority > UNSUPPORTED_PRIORITY && balance.amount > 0,
        )
        .sort(
          (lhs, rhs) =>
            rhs.priority - lhs.priority ||
            rhs.balance.amount - lhs.balance.amount ||
            lhs.balance.currency.localeCompare(rhs.balance.currency),
        )
        .map(({ balance }) => balance),
    [balances],
  );

  const rows = useMemo<WalletRowModel[]>(
    () =>
      sortedBalances.map((balance) => ({
        currency: balance.currency,
        blockchain: balance.blockchain,
        amount: balance.amount,
        formattedAmount: amountFormatter.format(balance.amount),
        usdValue: (prices[balance.currency] ?? 0) * balance.amount,
      })),
    [sortedBalances, prices],
  );

  return (
    <div {...rest}>
      {rows.map((row) => (
        <WalletRow
          className={classes.row}
          key={`${row.blockchain}-${row.currency}`}
          amount={row.amount}
          usdValue={row.usdValue}
          formattedAmount={row.formattedAmount}
        />
      ))}
      {children}
    </div>
  );
};

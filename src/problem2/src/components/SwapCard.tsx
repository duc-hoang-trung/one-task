import { useEffect, useRef, useState } from 'react';

import {
  formatAmount,
  formatRate,
  parseAmount,
  sanitiseAmountInput,
  toAmountInput,
} from '../lib/format';
import { quoteSwap, validate } from '../lib/quote';
import {
  SETTLEMENT_DELAY_MS,
  applySwap,
  balanceOf,
  initialBalances,
  newReference,
} from '../lib/wallet';
import type { Receipt as SwapReceipt, SwapSide, Token } from '../types';
import { Derivation } from './Derivation';
import { Receipt } from './Receipt';
import { TokenField } from './TokenField';
import { TokenSelect } from './TokenSelect';
import styles from './SwapCard.module.css';

const WARNING_ID = 'swap-warning';

interface SwapCardProps {
  tokens: Token[];
  initialPay: Token;
  initialReceive: Token;
}

export const SwapCard = ({
  tokens,
  initialPay,
  initialReceive,
}: SwapCardProps) => {
  const [payToken, setPayToken] = useState(initialPay);
  const [receiveToken, setReceiveToken] = useState(initialReceive);
  const [rawAmount, setRawAmount] = useState('');
  const [balances, setBalances] = useState(() =>
    initialBalances(tokens.map((token) => token.symbol)),
  );
  const [swapping, setSwapping] = useState(false);
  const [picking, setPicking] = useState<SwapSide | null>(null);
  const [receipt, setReceipt] = useState<SwapReceipt | null>(null);
  const [flips, setFlips] = useState(0);
  const [showInverse, setShowInverse] = useState(false);
  const settlement = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(settlement.current), []);

  const payBalance = balanceOf(balances, payToken.symbol);
  const payAmount = parseAmount(rawAmount);
  const quote = quoteSwap(payToken, receiveToken, payAmount);
  const validation = validate(rawAmount, payAmount, payToken, payBalance);
  const ready = validation.code === 'ok' && !swapping;

  const flip = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setRawAmount(quote.receiveAmount > 0 ? toAmountInput(quote.receiveAmount) : '');
    setFlips((current) => current + 1);
  };

  const choose = (token: Token) => {
    const side = picking;
    setPicking(null);
    if (!side) return;

    const opposite = side === 'pay' ? receiveToken : payToken;
    if (token.symbol === opposite.symbol) {
      flip();
      return;
    }

    if (side === 'pay') {
      setPayToken(token);
    } else {
      setReceiveToken(token);
    }
  };

  const submit = () => {
    if (!ready) return;

    setSwapping(true);
    const settled = { ...quote, payToken, receiveToken };

    settlement.current = window.setTimeout(() => {
      setBalances((current) =>
        applySwap(
          current,
          settled.payToken.symbol,
          settled.payAmount,
          settled.receiveToken.symbol,
          settled.receiveAmount,
        ),
      );
      setReceipt({
        id: newReference(),
        paySymbol: settled.payToken.symbol,
        payAmount: settled.payAmount,
        receiveSymbol: settled.receiveToken.symbol,
        receiveAmount: settled.receiveAmount,
      });
      setRawAmount('');
      setSwapping(false);
    }, SETTLEMENT_DELAY_MS);
  };

  const actionLabel = () => {
    if (swapping) return 'Swapping';
    if (validation.code === 'insufficient-balance') {
      return `Not enough ${payToken.symbol}`;
    }
    if (validation.code !== 'ok') return 'Enter an amount';
    return `Swap ${payToken.symbol} for ${receiveToken.symbol}`;
  };

  const rate = showInverse
    ? `1 ${receiveToken.symbol} = ${formatRate(1 / quote.rate)} ${payToken.symbol}`
    : `1 ${payToken.symbol} = ${formatRate(quote.rate)} ${receiveToken.symbol}`;

  return (
    <>
      <form
        className={styles.card}
        data-busy={swapping}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className={styles.fields} inert={swapping}>
          <TokenField
            label="You pay"
            token={payToken}
            balance={payBalance}
            usdValue={quote.payValueUsd}
            value={rawAmount}
            invalid={validation.message !== null}
            describedBy={validation.message ? WARNING_ID : undefined}
            onPickToken={() => setPicking('pay')}
            onAmountChange={(next) => setRawAmount(sanitiseAmountInput(next))}
            onUseMax={() => setRawAmount(toAmountInput(payBalance))}
          />

          <button
            type="button"
            className={styles.flip}
            onClick={flip}
            aria-label={`Swap direction — pay ${receiveToken.symbol} instead`}
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
              style={{ transform: `rotate(${flips * 180}deg)` }}
            >
              <path
                d="M4.5 2v9m0 0L2 8.6m2.5 2.4L7 8.6M11.5 14V5m0 0L9 7.4M11.5 5L14 7.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <TokenField
            label="You receive"
            token={receiveToken}
            balance={balanceOf(balances, receiveToken.symbol)}
            usdValue={quote.receiveAmount * receiveToken.priceUsd}
            value={
              quote.receiveAmount > 0 ? formatAmount(quote.receiveAmount) : ''
            }
            onPickToken={() => setPicking('receive')}
          />
        </div>

        {validation.message && (
          <p className={styles.warning} id={WARNING_ID} role="alert">
            {validation.message}
          </p>
        )}

        <button
          type="button"
          className={styles.rate}
          onClick={() => setShowInverse((current) => !current)}
          aria-label={`Exchange rate, ${rate}. Show the rate the other way round.`}
        >
          <span className={styles.rateLabel}>Rate</span>
          <span className={styles.rateValue}>{rate}</span>
        </button>

        {payAmount > 0 && (
          <Derivation
            payToken={payToken}
            receiveToken={receiveToken}
            quote={quote}
          />
        )}

        <button type="submit" className={styles.action} disabled={!ready}>
          {swapping && <span className={styles.spinner} aria-hidden="true" />}
          {actionLabel()}
        </button>
      </form>

      {picking && (
        <TokenSelect
          title={picking === 'pay' ? 'Token to pay with' : 'Token to receive'}
          tokens={tokens}
          balances={balances}
          selectedSymbol={
            picking === 'pay' ? payToken.symbol : receiveToken.symbol
          }
          onSelect={choose}
          onDismiss={() => setPicking(null)}
        />
      )}

      {receipt && (
        <Receipt receipt={receipt} onDismiss={() => setReceipt(null)} />
      )}
    </>
  );
};

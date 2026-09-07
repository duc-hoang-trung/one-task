import { formatAmount, formatUsd } from '../lib/format';
import type { Token } from '../types';
import { TokenIcon } from './TokenIcon';
import styles from './TokenField.module.css';

interface TokenFieldProps {
  label: string;
  token: Token;
  balance: number;
  usdValue: number;
  value: string;
  invalid?: boolean;
  describedBy?: string;
  onPickToken: () => void;
  onAmountChange?: (next: string) => void;
  onUseMax?: () => void;
}

const inputId = (label: string) => `amount-${label.replace(/\s+/g, '-')}`;

const lengthStep = (value: string) => {
  if (value.length > 16) return 'xl';
  if (value.length > 11) return 'l';
  return 'm';
};

export const TokenField = ({
  label,
  token,
  balance,
  usdValue,
  value,
  invalid = false,
  describedBy,
  onPickToken,
  onAmountChange,
  onUseMax,
}: TokenFieldProps) => (
  <section className={styles.field} data-invalid={invalid}>
    <header className={styles.head}>
      {onAmountChange ? (
        <label className={styles.label} htmlFor={inputId(label)}>
          {label}
        </label>
      ) : (
        <span className={styles.label}>{label}</span>
      )}

      <span className={styles.holding}>
        <span className={styles.holdingValue}>
          {balance > 0 ? formatAmount(balance) : '0.00'} {token.symbol}
        </span>
        {onUseMax && (
          <button
            type="button"
            className={styles.max}
            onClick={onUseMax}
            disabled={balance <= 0}
          >
            Max
          </button>
        )}
      </span>
    </header>

    <div className={styles.body}>
      <button type="button" className={styles.token} onClick={onPickToken}>
        <TokenIcon token={token} />
        <span className={styles.symbol}>{token.symbol}</span>
        <svg
          className={styles.chevron}
          viewBox="0 0 10 6"
          width="10"
          height="6"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {onAmountChange ? (
        <input
          id={inputId(label)}
          className={styles.amount}
          data-length={lengthStep(value)}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder="0.00"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onAmountChange(event.target.value)}
        />
      ) : (
        <output
          className={styles.amount}
          data-readonly="true"
          data-empty={value === ''}
          data-length={lengthStep(value)}
        >
          {value === '' ? '0.00' : value}
        </output>
      )}
    </div>

    <p className={styles.usd}>{usdValue > 0 ? formatUsd(usdValue) : '$0.00'}</p>
  </section>
);

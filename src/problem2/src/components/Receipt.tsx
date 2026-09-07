import { useEffect, useRef } from 'react';

import { formatAmount } from '../lib/format';
import type { Receipt as SwapReceipt } from '../types';
import styles from './Receipt.module.css';

const VISIBLE_MS = 6000;

interface ReceiptProps {
  receipt: SwapReceipt;
  onDismiss: () => void;
}

export const Receipt = ({ receipt, onDismiss }: ReceiptProps) => {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss.current(), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [receipt.id]);

  return (
  <aside className={styles.receipt} role="status">
    <span className={styles.mark} aria-hidden="true">
      <svg viewBox="0 0 12 12" width="12" height="12">
        <path
          d="M2 6.3l2.6 2.6L10 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>

    <div className={styles.body}>
      <p className={styles.headline}>Swapped</p>
      <p className={styles.detail}>
        {formatAmount(receipt.payAmount)} {receipt.paySymbol} for{' '}
        {formatAmount(receipt.receiveAmount)} {receipt.receiveSymbol}
      </p>
      <p className={styles.reference}>ref {receipt.id}</p>
    </div>

    <button
      type="button"
      className={styles.dismiss}
      onClick={onDismiss}
      aria-label="Dismiss"
    >
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path
          d="M2 2l8 8M10 2l-8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  </aside>
  );
};

import { formatAmount, formatQuotedAt } from '../lib/format';
import type { Quote } from '../lib/quote';
import type { Token } from '../types';
import styles from './Derivation.module.css';

interface DerivationProps {
  payToken: Token;
  receiveToken: Token;
  quote: Quote;
}

interface Line {
  operator: string;
  label: string;
  value: string;
  unit: string;
  source?: string;
  total?: boolean;
}

export const Derivation = ({
  payToken,
  receiveToken,
  quote,
}: DerivationProps) => {
  const lines: Line[] = [
    {
      operator: '',
      label: 'you pay',
      value: formatAmount(quote.payAmount),
      unit: payToken.symbol,
    },
    {
      operator: '×',
      label: 'feed price',
      value: formatAmount(payToken.priceUsd),
      unit: `USD/${payToken.symbol}`,
      source: formatQuotedAt(payToken.quotedAt),
    },
    {
      operator: '=',
      label: 'value',
      value: formatAmount(quote.payValueUsd),
      unit: 'USD',
    },
    {
      operator: '÷',
      label: 'feed price',
      value: formatAmount(receiveToken.priceUsd),
      unit: `USD/${receiveToken.symbol}`,
      source: formatQuotedAt(receiveToken.quotedAt),
    },
    {
      operator: '=',
      label: 'you receive',
      value: formatAmount(quote.receiveAmount),
      unit: receiveToken.symbol,
      total: true,
    },
  ];

  return (
    <section className={styles.derivation} aria-label="How this quote is worked out">
      <h2 className={styles.heading}>Worked out through USD</h2>

      <dl className={styles.lines}>
        {lines.map((line, index) => (
          <div
            key={line.label + line.unit}
            className={styles.line}
            data-total={line.total ?? false}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <span className={styles.operator} aria-hidden="true">
              {line.operator}
            </span>
            <dt className={styles.term}>
              {line.label}
              {line.source && <span className={styles.source}>{line.source}</span>}
            </dt>
            <dd className={styles.figure}>
              <span className={styles.number}>{line.value}</span>
              <span className={styles.unit}>{line.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

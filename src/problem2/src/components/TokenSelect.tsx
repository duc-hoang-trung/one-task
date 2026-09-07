import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { formatAmount, formatUsd } from '../lib/format';
import { balanceOf } from '../lib/wallet';
import type { Token } from '../types';
import { TokenIcon } from './TokenIcon';
import styles from './TokenSelect.module.css';

interface TokenSelectProps {
  title: string;
  tokens: Token[];
  balances: Record<string, number>;
  selectedSymbol: string;
  onSelect: (token: Token) => void;
  onDismiss: () => void;
}

export const TokenSelect = ({
  title,
  tokens,
  balances,
  selectedSymbol,
  onSelect,
  onDismiss,
}: TokenSelectProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? tokens.filter((token) => token.symbol.toLowerCase().includes(needle))
      : tokens;

    return [...matching].sort(
      (lhs, rhs) =>
        balanceOf(balances, rhs.symbol) * rhs.priceUsd -
        balanceOf(balances, lhs.symbol) * lhs.priceUsd,
    );
  }, [tokens, balances, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const move = (delta: number) => {
    if (matches.length === 0) return;
    setActiveIndex(
      (current) => (current + delta + matches.length) % matches.length,
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter') {
      const token = matches[activeIndex];
      if (token) {
        event.preventDefault();
        onSelect(token);
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={title}
      onClose={onDismiss}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === dialogRef.current) onDismiss();
      }}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Close"
        >
          esc
        </button>
      </header>

      <div className={styles.search}>
        <input
          className={styles.input}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${tokens.length} tokens`}
          aria-label="Search tokens"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.list} ref={listRef}>
        {matches.map((token, index) => {
          const balance = balanceOf(balances, token.symbol);

          return (
            <button
              type="button"
              key={token.symbol}
              className={styles.row}
              data-active={index === activeIndex}
              data-selected={token.symbol === selectedSymbol}
              aria-current={token.symbol === selectedSymbol}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => onSelect(token)}
            >
              <TokenIcon token={token} size={30} />
              <span className={styles.symbol}>{token.symbol}</span>
              <span className={styles.figures}>
                <span className={styles.balance}>
                  {balance > 0 ? formatAmount(balance) : '0.00'}
                </span>
                <span className={styles.price}>
                  {formatUsd(token.priceUsd)}
                </span>
              </span>
            </button>
          );
        })}

        {matches.length === 0 && (
          <p className={styles.empty}>
            No token matches “{query.trim()}”. Try a shorter search.
          </p>
        )}
      </div>
    </dialog>
  );
};

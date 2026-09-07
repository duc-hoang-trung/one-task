import { useEffect, useState } from 'react';

import { Masthead } from './components/Masthead';
import { SwapCard } from './components/SwapCard';
import { fetchTokens } from './lib/prices';
import type { Token } from './types';
import styles from './App.module.css';

type Feed =
  | { state: 'loading' }
  | { state: 'failed'; message: string }
  | { state: 'ready'; tokens: Token[] };

const defaultPair = (tokens: Token[]): [Token, Token] | null => {
  const [first, second] = tokens;
  if (!first || !second) return null;

  const pay = tokens.find((token) => token.symbol === 'ETH') ?? first;
  const receive =
    tokens.find(
      (token) => token.symbol === 'ATOM' && token.symbol !== pay.symbol,
    ) ??
    tokens.find((token) => token.symbol !== pay.symbol) ??
    second;

  return [pay, receive];
};

export const App = () => {
  const [feed, setFeed] = useState<Feed>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setFeed({ state: 'loading' });

    fetchTokens(controller.signal)
      .then((tokens) => setFeed({ state: 'ready', tokens }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setFeed({
          state: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'The price feed could not be reached.',
        });
      });

    return () => controller.abort();
  }, [attempt]);

  const pair = feed.state === 'ready' ? defaultPair(feed.tokens) : null;

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <Masthead />

        {feed.state === 'loading' && (
          <div className={styles.placeholder} aria-busy="true">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
            <p className={styles.placeholderNote}>Loading prices…</p>
          </div>
        )}

        {feed.state === 'failed' && (
          <div className={styles.problem} role="alert">
            <p className={styles.problemTitle}>The price feed is unreachable</p>
            <p className={styles.problemBody}>{feed.message}</p>
            <button
              type="button"
              className={styles.retry}
              onClick={() => setAttempt((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {feed.state === 'ready' && !pair && (
          <div className={styles.problem} role="alert">
            <p className={styles.problemTitle}>Nothing to swap</p>
            <p className={styles.problemBody}>
              The feed returned fewer than two priced tokens.
            </p>
          </div>
        )}

        {feed.state === 'ready' && pair && (
          <SwapCard
            tokens={feed.tokens}
            initialPay={pair[0]}
            initialReceive={pair[1]}
          />
        )}
      </div>
    </main>
  );
};

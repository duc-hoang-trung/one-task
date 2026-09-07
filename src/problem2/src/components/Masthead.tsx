import styles from './Masthead.module.css';

export const Masthead = () => (
  <header className={styles.masthead}>
    <div className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 20 20" width="20" height="20">
          <path
            d="M3 6.5h11M11 3l3.4 3.5L11 10M17 13.5H6M9 10l-3.4 3.5L9 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.wordmark}>Crossrate</span>
    </div>

    <h1 className={styles.headline}>
      Swap at feed prices.
    </h1>
  </header>
);

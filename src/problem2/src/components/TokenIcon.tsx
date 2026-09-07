import { useState } from 'react';

import { tokenIconUrl } from '../lib/prices';
import type { Token } from '../types';
import styles from './TokenIcon.module.css';

interface TokenIconProps {
  token: Token;
  size?: number;
}

export const TokenIcon = ({ token, size = 26 }: TokenIconProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = tokenIconUrl(token);
  const style = { width: size, height: size };

  if (failedSrc === src) {
    return (
      <span className={styles.fallback} style={style} aria-hidden="true">
        {token.symbol.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      className={styles.icon}
      style={style}
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailedSrc(src)}
    />
  );
};

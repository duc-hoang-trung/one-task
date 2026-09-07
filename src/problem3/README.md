# Problem 3, Messy React

## Bugs

1. `lhsPriority` does not exist. The filter creates `balancePriority`.
2. Filter keeps `amount <= 0`, so it shows only the empty balances.
3. `formattedBalances` is unused, so `formattedAmount` is always `undefined`.
4. `prices[currency] * amount` is unguarded, so a token with no price gives `NaN`.
5. Compare returns nothing on a tie. `Zilliqa` and `Neo` are both 20.

## Types

6. `WalletBalance` has no `blockchain`, but the code sorts by it.
7. `getPriority(blockchain: any)`.
8. Map callback types items as `FormattedWalletBalance` over a `WalletBalance[]`. Hides 3.
9. `interface Props extends BoxProps {}` is empty.
10. `React.FC<Props>` and `(props: Props)` type the props twice.

## Performance

11. `prices` is in the memo deps but never read, so every tick re-runs the sort for the same result.
12. `getPriority` sits in the component. New function per render.
13. Compare recomputes both priorities, about `2n log n` calls.
14. `formattedBalances` and `rows` have no memo.

## Rendering

15. `key={index}` on a sorted list, so React reuses the wrong rows.
16. `toFixed()` rounds to 0 decimals. `1234.5678` shows as `1235`.
17. `children` is destructured, never rendered.
18. No second sort key, so ties reshuffle.

## Refactor

- `Object.hasOwn` guard, not a cast. `in` is wrong: `'toString' in BLOCKCHAIN_PRIORITY` is `true`.
- Two memos. Sort on `balances`, format on `prices`.
- Missing price gives USD `0` and keeps the row.

var sum_to_n_a = function (n) {
  const limit = Math.abs(n);

  let total = 0;
  for (let i = 1; i <= limit; i += 1) {
    total += i;
  }

  return n < 0 ? -total : total;
};

var sum_to_n_b = function (n) {
  const limit = Math.abs(n);
  const total = (limit * (limit + 1)) / 2;

  return n < 0 ? -total : total;
};

var sum_to_n_c = function (n) {
  if (n === 0) return 0;

  return n < 0 ? n + sum_to_n_c(n + 1) : n + sum_to_n_c(n - 1);
};

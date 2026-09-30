export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export const round = (n: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Percent change from `from` to `to`, as a fraction (0.24 = +24%). */
export const pctChange = (from: number, to: number) => (from > 0 ? (to - from) / from : 0);

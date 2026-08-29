'use strict';

/**
 * Transparent baseline forecasting.
 *
 * This is a deterministic baseline, not an ML claim.
 */

function linearTrend(values = []) {
  const nums = values
    .map(Number)
    .filter(Number.isFinite);

  if (!nums.length) {
    return {
      baseline: 0,
      slope: 0,
      next: 0
    };
  }

  if (nums.length === 1) {
    return {
      baseline: nums[0],
      slope: 0,
      next: nums[0]
    };
  }

  const first = nums[0];
  const last = nums[nums.length - 1];

  const slope = (last - first) / (nums.length - 1);

  return {
    baseline: first,
    slope: Number(slope.toFixed(4)),
    next: Number((last + slope).toFixed(4))
  };
}

function forecast(values = [], periods = 1) {
  const trend = linearTrend(values);

  return {
    ...trend,
    periods,
    projected: Array.from(
      { length: periods },
      (_, index) =>
        Number(
          (trend.next + trend.slope * index).toFixed(4)
        )
    )
  };
}

module.exports = {
  linearTrend,
  forecast
};

// @flow
const RateLimiter = require('./rate-limiter')

function throttle (fn: Function, rate: number, interval?: string|number) {
  let limiter = new RateLimiter(rate, interval || 1000)
  return function (...args: any) {
    if (!limiter.accept(1)) return
    return fn(...args)
  }
}

module.exports = throttle

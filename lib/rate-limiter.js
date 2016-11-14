// @flow

const TokenBucket = require('./token-bucket')

type StatCallback = (stat: Object) => void

/**
 * A generic rate limiter. Underneath the hood, this uses a token bucket plus
 * an additional check to limit how many tokens we can remove each interval.
 * @author John Hurliman <jhurliman@cull.tv>
 */
class RateLimiter {
  tokenBucket: TokenBucket
  curIntervalStart: number
  tokensThisInterval: number
  incomingThisInterval: number
  incoming: number
  accepted: number
  averageTime: number
  statCallback: ?StatCallback
  timeSum: number

  /**
   * @param  {Number} tokensPerInterval Maximum number of tokens that can be
   *  removed at any given moment and over the course of one interval.
   * @param {String|Number} [interval] The interval length in milliseconds, or as
   *  one of the following strings: 'second', 'minute', 'hour', day'.
   * @param  {StatCallback} [statCallback]
   */
  constructor (tokensPerInterval: number, interval: string|number, statCallback?: StatCallback) {
    this.tokenBucket = new TokenBucket(tokensPerInterval, tokensPerInterval, interval)

    // Fill the token bucket to start
    this.tokenBucket.content = tokensPerInterval

    this.curIntervalStart = Date.now()
    this.tokensThisInterval = 0
    this.incomingThisInterval = 0
    this.timeSum = 0
    this.incoming = 0
    this.accepted = 0
    this.averageTime = 0
    this.statCallback = statCallback
  }

  /**
   * Remove the requested number of tokens and fire the given callback. If the
   * rate limiter contains enough tokens and we haven't spent too many tokens
   * in this interval already, this will happen immediately. Otherwise, the
   * removal and callback will happen when enough tokens become available.
   * @param {Number} count The number of tokens to remove.
   * @returns {Boolean} True if transaction has been accepted, false otherwise
   */
  accept (count: number) {
    this.incomingThisInterval++

    // Make sure the request isn't for more than we can handle
    if (count > this.tokenBucket.bucketSize) return false

    let now: number = Date.now()

    // Advance the current interval and reset the current interval token count
    // if needed
    if (now - this.curIntervalStart >= this.tokenBucket.interval) {
      this.curIntervalStart = now
      this.accepted = now - this.curIntervalStart >= this.tokenBucket.interval * 2
        ? 0
        : this.tokensThisInterval
      this.incoming = now - this.curIntervalStart >= this.tokenBucket.interval * 2
        ? 0
        : this.incomingThisInterval
      this.averageTime = now - this.curIntervalStart >= this.tokenBucket.interval * 2
        ? 0
        : (this.tokensThisInterval ? Math.floor(this.timeSum / this.tokensThisInterval) : 0)
      this.tokensThisInterval = 0
      this.incomingThisInterval = 0
      this.timeSum = 0
      let fn: ?StatCallback = this.statCallback
      if (fn) fn(this.getStat())
    }

    // If we don't have enough tokens left in this interval, return false
    if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
      return false
    }

    // Remove the requested number of tokens from the token bucket
    let r: boolean = this.tokenBucket.accept(count)
    if (r) this.tokensThisInterval += count
    return r
  }

  /**
   * Helper function to add average time measure
   */
  addTime (time: number) {
    this.timeSum += time
  }

  /**
   * Get internal stats for previous interval
   */
  getStat (): Object {
    let now: number = Date.now()
    if (now - this.curIntervalStart >= this.tokenBucket.interval) {
      return {accepted: 0, incoming: 0, averageTime: 0, limit: this.tokenBucket.tokensPerInterval}
    }
    return {
      accepted: this.accepted,
      incoming: this.incoming,
      averageTime: this.averageTime,
      limit: this.tokenBucket.tokensPerInterval
    }
  }

  /**
   * Set new limit.
   * @param {Number} tokensPerInterval
   */
  setLimit (tokensPerInterval: number) {
    this.tokenBucket.bucketSize = this.tokenBucket.tokensPerInterval = tokensPerInterval
  }

  set limit (tokensPerInterval: number) {
    this.setLimit(tokensPerInterval)
  }

  get limit (): number {
    return this.tokenBucket.tokensPerInterval
  }
}

module.exports = RateLimiter

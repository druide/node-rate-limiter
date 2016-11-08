const RateLimiter = require('../')
// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter(1, 'second')

// Throttle requests

let arr = new Array(10000000).join('-').split('-')
let start = Date.now()

arr.forEach(function (v, i) {
  if (limiter.accept(1)) {
    console.log(i, 'after', Date.now() - start, 'ms')
  }
})

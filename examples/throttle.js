const throttle = require('..').throttle

const log = throttle(console.log, 10, 10000)

let i = 0
setInterval(() => {
    log(++i)
}, 100)

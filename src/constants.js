
const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
}

const DEFAULT_BROWSER_DISCOVERY_CONFIG = {
    // peer addresses to discover other peers
    peers: ['star.leofcoin.org/8080/3D1fftaVdwyzpmeSRPvgFGuvVo9v8QZKu1MfSSA1mRcxtfbUnt6KxW/disco-star',],
    // disco-star configuration see https://github.com/leofcoin/disco-star
    star: {
      protocol: 'disco-star',
      interval: 10000,    
      port: 8080
    },
    room: {
      protocol: 'disco-room',
      interval: 10000,
      port: 8080
    }
}

const DEFAULT_NODE_DISCOVERY_CONFIG = {
  // peer addresses to discover other peers
  peers: ['star.leofcoin.org/5000/3D1fftaVdwyzpmeSRPvgFGuvVo9v8QZKu1MfSSA1mRcxtfbUnt6KxW/disco-star'],
  // disco-star configuration see https://github.com/leofcoin/disco-star
  star: {
    protocol: 'disco-star',
    interval: 1000,
    port: 5000
  },
  room: {
    protocol: 'disco-room',
    interval: 1000,
    dialTimeout: 1000, // timeout before a dial is considered a failure
    port: 5000
  }
}  

const DEFAULT_NODE_API_CONFIG = {
  
}

const DEFAULT_CONFIG = {
  discovery: {
    // environmental
  },
  api: {
    protocol: 'disco-api',
    port: 4000
  },
  storage: {
    account: 'account',
    shards: 'shards', // path to shards
    blocks: 'blocks', // path to blocks
    database: 'database' // path to database
  },
  gateway: {
    protocol: 'disco-gate',
    port: 8585
  },
  transports: [
    'disco-wrtc:5000',
    'disco-ws:5005',
    'disco-tcp:5010'
  ],
  services: [
    'disco-star',
    'disco-room'
  ],
  version: '1.0.40-alpha.5'
}

export { DEFAULT_CONFIG, DEFAULT_QR_OPTIONS, DEFAULT_NODE_DISCOVERY_CONFIG, DEFAULT_BROWSER_DISCOVERY_CONFIG }

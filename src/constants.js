
const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
}

const DEFAULT_CONFIG = {
  discovery: {
    // peer addresses to discover other peers
    peers: ['IPv6/star.leofcoin.org/6000/disco-room/'],
    // disco-star configuration see https://github.com/leofcoin/disco-star
    star: {
      protocol: 'disco-room',
      port: 6000
    }
  },
  api: {
    protocol: 'leofcoin-api',
    port: 4000
  },
  storage: {
    account: 'account',
    shards: 'shards', // path to shards
    blocks: 'blocks', // path to blocks
    database: 'database' // path to database
  },
  gateway: {
    protocol: 'leofcoin',
    port: 8080
  },
  services: [
    'disco-star',
    'disco-room'
  ],
  version: '1.0.5'
}

export { DEFAULT_CONFIG, DEFAULT_QR_OPTIONS }

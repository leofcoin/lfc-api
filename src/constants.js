
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
    peers: ['star.leofcoin.org/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'],
    // disco-star configuration see https://github.com/leofcoin/disco-star
    star: {
      protocol: 'disco-room',
      port: 8080
    }
}

const DEFAULT_NODE_DISCOVERY_CONFIG = {
  // peer addresses to discover other peers
  peers: ['star.leofcoin.org/5000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'],
  // disco-star configuration see https://github.com/leofcoin/disco-star
  star: {
    protocol: 'disco-room',
    interval: 10000,
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
  version: '1.0.9'
}

export { DEFAULT_CONFIG, DEFAULT_QR_OPTIONS, DEFAULT_NODE_DISCOVERY_CONFIG, DEFAULT_BROWSER_DISCOVERY_CONFIG }

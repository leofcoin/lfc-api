'use strict';

let QRCode;
let Ipfs;
let LeofcoinStorage;

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

function _interopNamespace(e) {
  if (e && e.__esModule) { return e; } else {
    var n = {};
    if (e) {
      Object.keys(e).forEach(function (k) {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      });
    }
    n['default'] = e;
    return n;
  }
}

var MultiWallet = _interopDefault(require('multi-wallet'));
require('node-fetch');
require('crypto-js/aes.js');
require('crypto-js/enc-utf8.js');
var DiscoBus = _interopDefault(require('@leofcoin/disco-bus'));
var multicodec = _interopDefault(require('multicodec'));
require('ipld-lfc');
require('ipld-lfc-tx');

const DEFAULT_CONFIG = {
  strap: [
    '/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4'
  ],
  storage: {
    account: 'lfc-account',
    config: 'lfc-config',
  },
  version: '1.0.40-alpha.5'
};

const merge = (object, source) => {
  for (const key of Object.keys(object)) {
    if (typeof object[key] === 'object' && source[key] && !Array.isArray(source[key])) object[key] = merge(object[key], source[key]);
    else if(source[key] && typeof object[key] !== 'object'|| Array.isArray(source[key])) object[key] = source[key];
  }
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !object[key] && !Array.isArray(source[key])) object[key] = merge(object[key] || {}, source[key]);
    else if (typeof source[key] !== 'object' && !object[key] || Array.isArray(source[key])) object[key] = source[key];
  }
  return object
};

//

const generateProfile = async () => {
  const wallet = new MultiWallet('leofcoin:olivia');
  const mnemonic = wallet.generate();
  const account = wallet.account(0);
  const external = account.external(0);
  return {
    mnemonic,
    publicKey: external.publicKey,
    privateKey: external.privateKey,
    walletId: external.id
  }
};

var init = async _config => {
  await new Promise((resolve, reject) => {
      if (!LeofcoinStorage) LeofcoinStorage = require('lfc-storage');
      resolve();
    });
  
  globalThis.configStore = new LeofcoinStorage('lfc-config');
  globalThis.accountStore = new LeofcoinStorage('lfc-account');
  
  let config = await configStore.get();
  if (!config || Object.keys(config).length === 0) {
    config = merge(DEFAULT_CONFIG, config);
    config = merge(config, _config);
    
    // private node configuration & identity
    await configStore.put(config);
    // by the public accessible account details
  }
  
  // config = await upgrade(config)
  
  return config;
};

const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

class LeofcoinApi extends DiscoBus {
  constructor(options = { config: {}, init: true, start: true }) {
    super();
    if (!options.config) options.config = {};
    if (options.init) return this._init(options)
  }
  
  async _init({config, start}) {
    config = await init(config);
    if (!config.identity) {
      config.identity = await generateProfile();
      
      await configStore.put(config);
      await accountStore.put({ public: { walletId: config.identity.walletId }});
    }
    if (start) await this.start(config);
    return this;
  }
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}) {
    await new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve();
      });
    
    // TODO: encrypt config
    try {
      this.ipfs = await Ipfs.create({
        pass: config.identity.privateKey,
        repo: configStore.root,
        ipld: {
          async loadFormat (codec) {
            if (codec === multicodec.LEOFCOIN_BLOCK) {
              return new Promise(function (resolve) { resolve(_interopNamespace(require('ipld-lfc'))); })
            } else if (codec === multicodec.LEOFCOIN_TX) {
              return new Promise(function (resolve) { resolve(_interopNamespace(require('ipld-lfc-tx'))); })
            } else {
              throw new Error('unable to load format ' + multicodec.print[codec])
            }
          }
        },
        libp2p: {
          config: {
            dht: {
              enabled: true
            }
          }
        },
        config: {
          Addresses: {
            Swarm: [
              `/ip4/45.137.149.26/tcp/${https ? 4444 : 4430}/${https ? 'wss' : 'ws'}/p2p-websocket-star`,
            ]
          },
          Bootstrap: [
            `/ip4/45.137.149.26/tcp/4003/${https ? 'wss' : 'ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
            `/p2p-circuit/ip4/45.137.149.26/tcp/4003/${https ? 'wss' : 'ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`
          ]
        },
        EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
      });
    } catch (e) {
      console.error(e);
    }
    
    const { id, addresses } = await this.ipfs.id();
    this.addresses = addresses;
    this.peerId = id;
    
    return this
    
  }
  
  
}

module.exports = LeofcoinApi;

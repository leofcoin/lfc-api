'use strict';

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
  await new Promise(async (resolve, reject) => {
        if (!window.LeofcoinStorage) {
          const imported = await Promise.resolve().then(function () { return level; });
          window.LeofcoinStorage = imported.default;
          resolve();
        }
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
        if (!window.Ipfs) {
          const script = document.createElement('script');
          script.onload = () => resolve();
          script.src = 'https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js';
          document.body.appendChild(script);
        } else {
          resolve();
        }        
      });
    
    // TODO: encrypt config
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
            '/ip4/45.137.149.26/tcp/4430/ws/p2p-websocket-star'
          ]
        },
        Bootstrap: [          
          '/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/p2p-circuit/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/p2p-circuit/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/ip4/45.137.149.26/tcp/4001/ipfs/QmP4tp5VoUNmGzApvFvQPkMXHLzafr7ULmhiswpeJ2fd4Z', 
          '/p2p-circuit/ip4/45.137.149.26/tcp/4001/ipfs/QmP4tp5VoUNmGzApvFvQPkMXHLzafr7ULmhiswpeJ2fd4Z'          
        ]
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    });
    
    const { id, addresses } = await this.ipfs.id();
    this.addresses = addresses;
    this.peerId = id;
    
    return this
    
  }
  
  
}

// const level = require('level');
const LevelStore = require('datastore-level');
const { homedir } = require('os');
const { join } = require('path');
const Key = require('interface-datastore').Key;
const {readdirSync, mkdirSync} = require('fs');

class LeofcoinStorage$1 {

  constructor(path, root = '.leofcoin') {
    this.root = join(homedir(), root);
    if (readdirSync) try {
      readdirSync(this.root);
    } catch (e) {
      if (e.code === 'ENOENT') mkdirSync(this.root);
      else throw e
    }
    this.db = new LevelStore(join(this.root, path));
    // this.db = level(path, { prefix: 'lfc-'})
  }
  
  toBuffer(value) {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'object' ||
        typeof value === 'boolean' ||
        !isNaN(value)) value = JSON.stringify(value);
        
    return Buffer.from(value)
  }
  
  async many(type, _value) {    
    const jobs = [];
    
    for (const key of Object.keys(_value)) {
      const value = this.toBuffer(_value[key]);
      
      jobs.push(this[type](key, value));
    }
    
    return Promise.all(jobs)
  }
  
  async put(key, value) {
    if (typeof key === 'object') return this.many('put', key);
    value = this.toBuffer(value);
        
    return this.db.put(new Key(key), value);    
  }
  
  async query() {
    const object = {};
    
    for await (let query of this.db.query({})) {
      const key = query.key.baseNamespace();
      object[key] = this.possibleJSON(query.value);
    }
    
    return object
  }
  
  async get(key) {
    if (!key) return this.query()
    if (typeof key === 'object') return this.many('get', key);
    
    let data = await this.db.get(new Key(key));
    if (!data) return undefined
        
    return this.possibleJSON(data)
  }
  
  async has(key) {
    if (typeof key === 'object') return this.many('has', key);
    
    try {
      await this.db.get(new Key(key));
      return true;
    } catch (e) {
      return false
    }
  }
  
  async delete(key) {
    return this.db.delete(new Key(key))
  }
  
  possibleJSON(data) {
    let string = data.toString();
    if (string.charAt(0) === '{' && string.charAt(string.length - 1) === '}' || 
        string.charAt(0) === '[' && string.charAt(string.length - 1) === ']' ||
        string === 'true' ||
        string === 'false' ||
        !isNaN(string)) 
        return JSON.parse(string);
        
    return data;
  }

}

var level = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': LeofcoinStorage$1
});

module.exports = LeofcoinApi;

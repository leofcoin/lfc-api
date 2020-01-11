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
var multicodec$2 = _interopDefault(require('multicodec'));
var cids = _interopDefault(require('cids'));
var multihashingAsync = _interopDefault(require('multihashing-async'));
var protons$2 = _interopDefault(require('protons'));
var classIs$2 = _interopDefault(require('class-is'));

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

function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var CID = _interopDefault$1(cids);
var multicodec = _interopDefault$1(multicodec$2);
var multihashing = _interopDefault$1(multihashingAsync);
var protons = _interopDefault$1(protons$2);
var classIs = _interopDefault$1(classIs$2);

var proto = `// LFC Block

message LFCTransactionLink {
  required string multihash = 1;
  required uint64 size = 2;
}

message LFCBlock {
  required uint64 index = 1;
  required string prevHash = 2;
  required uint64 time = 3;
  required uint64 nonce = 4;
  repeated LFCTransactionLink transactions = 5;
}`;

const codec = multicodec.LEOFCOIN_BLOCK;
const defaultHashAlg = multicodec.KECCAK_512;


const serialize = block => {
  return protons(proto).LFCBlock.encode(block)
};

const deserialize = buffer => {
  return protons(proto).LFCBlock.decode(buffer)
};

var LFCTransactionLink = classIs(class LFCTransactionLink {
  get _keys() {
    return ['multihash', 'size']
  }
  constructor(link) {
    if (link) {
      this._defineLink(link);
    }
  }
  
  _defineLink(link) {
    return this._keys.forEach(key => {
      Object.defineProperty(this, key, {
        value: link[key],
        writable: false
      });
    })
  }
  
  toJSON() {
    return this._keys.reduce((p, c) => {
      p[c] = this[c];
      return p
    }, {})
  }
  
  toString () {
    return `LFCTransactionLink <multihash: "${this.multihash.toString()}", size: "${this.size}">`
  }
}, { className: 'LFCTransactionLink', symbolName: '@leofcoin/ipld-lfc/lfc-transaction-link'});

var LFCNode = classIs(class LFCNode {
  get _keys() {
    return ['index', 'prevHash', 'time', 'transactions', 'nonce']
  }
  constructor(block) {
    
    if (Buffer.isBuffer(block)) {
      this._defineBlock(deserialize(block));
    } else if (block) {
      this._defineBlock(block);
    }
  }
  
  serialize() {
    return serialize(this._keys.reduce((p, c) => {
      p[c] = this[c];
      return p
    }, {}))
  }
  
  _defineBlock(block) {
    return this._keys.forEach(key => {
      if (key === 'transactions') {
        block[key] = block[key].map(tx => new LFCTransactionLink(tx));
      }
      Object.defineProperty(this, key, {
        value: block[key],
        writable: false
      });
    })
  }
  
  toJSON() {
    return this._keys.reduce((p, c) => {
      if (c === 'transactions') p[c] = this[c].map(tx => tx.toJSON());
      else p[c] = this[c];
      return p
    }, {})
  }
  
  toString () {
    return `LFCNode <index: "${this.index.toString()}", prevHash: "${this.prevHash.toString('hex')}", time: "${this.time.toString()}", nonce: "${this.nonce.toString()}", transactions: "${this.transactions.length}", size: ${this.size}>`
  }
  
  get size () {
    return this.transactions.reduce((p, c) => p + c.size, this.serialize().length)
  }
}, { className: 'LFCNode', symbolName: '@leofcoin/ipld-lfc/lfc-node'});

function _interopDefault$2 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var CID$1 = _interopDefault$2(cids);
var multicodec$1 = _interopDefault$2(multicodec$2);
var multihashing$1 = _interopDefault$2(multihashingAsync);
var protons$1 = _interopDefault$2(protons$2);
var classIs$1 = _interopDefault$2(classIs$2);

var proto$1 = `// Leofcoin Transaction

message LFCOutput {
  required uint64 index = 1;
  required uint64 amount = 2;
  required string address = 3;
}

message LFCInput {
  required uint64 index = 1;
  required string tx = 2;  
  required uint64 amount = 3;
  required string address = 4;
  required string signature = 5;
}

message LFCTransaction {
  required string id = 1;
  required uint64 time = 2;
  required string hash = 3;
  optional string reward = 4;
  repeated LFCInput inputs = 5;
  repeated LFCOutput outputs = 6;
}`;

const codec$1 = multicodec$1.LEOFCOIN_TX;
const defaultHashAlg$1 = multicodec$1.KECCAK_256;

const serialize$1 = block => {
  return protons$1(proto$1).LFCTransaction.encode(block)
};

const deserialize$1 = buffer => {
  return protons$1(proto$1).LFCTransaction.decode(buffer)
};

var LFCTx = classIs$1(class LFCTx {
  get _keys() {
    return ['id', 'time', 'hash', 'reward', 'inputs', 'outputs']
  }
  constructor(tx) {
    if (Buffer.isBuffer(tx)) {
      this._defineTx(deserialize$1(tx));
    } else if (tx) {
      this._defineTx(tx);
    }
  }
  
  serialize() {
    return serialize$1(this._keys.reduce((p, c) => {
      p[c] = this[c];
      return p
    }, {}))
  }
  
  _defineTx(tx) {
    return this._keys.forEach(key => {
      Object.defineProperty(this, key, {
        value: tx[key],
        writable: false
      });
    })
  }
  
  toJSON() {
    return this._keys.reduce((p, c) => {
      p[c] = this[c];
      return p
    }, {})
  }
  
  toString () {
    return `LFCTx <id: "${this.id.toString()}", time: "${this.time.toString()}", hash: "${this.hash.toString()}", reward: "${this.reward.toString()}", inputs: "${this.inputs.length}", outputs: "${this.outputs.length}", size: ${this.size}>`
  }
  
  get size () {
    return this.serialize().length
  }

}, { className: 'LFCTx', symbolName: '@leofcoin/ipld-lfc-tx/lfc-tx'});

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
    this.ipfs = await Ipfs.create({
      pass: config.identity.privateKey,
      repo: configStore.root,
      ipld: {
        async loadFormat (codec) {
          if (codec === multicodec$2.LEOFCOIN_BLOCK) {
            return new Promise(function (resolve) { resolve(_interopNamespace(require('ipld-lfc'))); })
          } else if (codec === multicodec$2.LEOFCOIN_TX) {
            return new Promise(function (resolve) { resolve(_interopNamespace(require('ipld-lfc-tx'))); })
          } else {
            throw new Error('unable to load format ' + multicodec$2.print[codec])
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

module.exports = LeofcoinApi;

'use strict';

let QRCode;

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
var AES = _interopDefault(require('crypto-js/aes.js'));
require('crypto-js/enc-utf8.js');

var config = {
  get: async (key) => {
    return configStore.get(key)
  },
  set: async (key, value) => {
    return configStore.put(key)
  },
  delete: async key => {
    return configStore.delete(key)
  }    
};

const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
};

const DEFAULT_CONFIG = {
  discovery: {
    // peer addresses to discover other peers
    peers: ['IPv6/star.leofcoin.org/6000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'],
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
  version: '1.0.6'
};

const expected = (expected, actual) => {
  const entries = Object.entries(actual)
    .map(entry => entry.join(!entry[1] ? `: undefined - ${entry[1]} ` : `: ${typeof entry[1]} - `));

  return `\nExpected:\n\t${expected.join('\n\t')}\n\nactual:\n\t${entries.join('\n\t')}`;
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

const generateQR = async (input, options = {}) => {
  options = { ...DEFAULT_QR_OPTIONS, ...options };

  if (!QRCode) QRCode = require('qrcode');
  
  return QRCode.toDataURL(input, options);
};

const generateProfileQR = async (profile = {}, options = {}) => {
  if (!profile || !profile.mnemonic) throw expected(['mnemonic: String'], profile)
  profile = JSON.stringify(profile);
  return generateQR(profile, options);
};
//

const generateProfile = async () => {
  const wallet = new MultiWallet('leofcoin:olivia');
  const mnemonic = wallet.generate();
  return {
    mnemonic,
    publicKey: wallet.account(0).node.publicKey,
    privateKey: wallet.account(0).node.privateKey,
    peerId: wallet.id
  }
};

const account = { 
  generateQR,
  generateProfileQR,
  generateProfile,
  import: async (identity, password) => {
    if (!identity) throw new Error('expected identity to be defined')
    if (identity.mnemonic) {
      const wallet = new MultiWallet('leofcoin:olivia');
      wallet.recover(identity.mnemonic);
      identity = {
        mnemonic: identity.mnemonic,
        publicKey: wallet.account(0).node.publicKey,
        privateKey: wallet.account(0).node.privateKey,
        peerId: wallet.id
      };
    }
    let config = await configStore.get();
    config = { ...DEFAULT_CONFIG, ...config, ...{ identity } };
    await configStore.put(config);
  },
  export: async password => {
    if (!password) throw expected(['password: String'], password)
    
    const identity = await configStore.get('identity');
    const account = await accountStore.get('public');
    
    if (!identity.mnemonic) throw expected(['mnemonic: String'], identity)
    
    const encrypted = AES.encrypt(JSON.stringify({ ...identity, ...account }), password).toString();
    return await generateQR(encrypted)
  }
};

// const level = require('level');
const LevelStore = require('datastore-level');
const { homedir } = require('os');
const { join } = require('path');
const Key = require('interface-datastore').Key;
const {readdirSync, mkdirSync} = require('fs');

class LeofcoinStorage {

  constructor(path) {
    this.root = homedir();
    if (readdirSync) try {
      readdirSync(join(this.root, '.leofcoin'));
    } catch (e) {
      if (e.code === 'ENOENT') mkdirSync(join(this.root, '.leofcoin'));
      else throw e
    }
    this.db = new LevelStore(join(this.root, '.leofcoin', path));
    // this.db = level(path, { prefix: 'lfc-'})
  }
  
  async many(type, _value) {    
    const jobs = [];
    
    for (const key of Object.keys(_value)) {
      let value = _value[key];      
      if (typeof value === 'object' ||
          typeof value === 'boolean' ||
          !isNaN(value)) value = JSON.stringify(value);
          
      jobs.push(this[type](key, value));
    }
    
    return Promise.all(jobs)
  }
  
  async put(key, value) {
    if (typeof key === 'object') return this.many('put', key);
    if (typeof value === 'object' ||
        typeof value === 'boolean' ||
        !isNaN(value)) value = JSON.stringify(value);
    
    return this.db.put(new Key(key), value);    
  }
  
  async query() {
    const object = {};
    
    for await (let value of this.db.query({})) {
      const key = value.key.baseNamespace();
      value = value.value.toString();
      object[key] = this.possibleJSON(value);
    }
    
    return object
  }
  
  async get(key) {
    if (!key) return this.query()
    if (typeof key === 'object') return this.many('get', key);
    
    let data = await this.db.get(new Key(key));
    if (!data) return undefined
    data = data.toString();
        
    return this.possibleJSON(data)
  }
  
  async delete(key) {
    return this.db.delete(new Key(key))
  }
  
  possibleJSON(string) {
    if (string.charAt(0) === '{' && string.charAt(string.length - 1) === '}' || 
        string.charAt(0) === '[' && string.charAt(string.length - 1) === ']' ||
        string === 'true' ||
        string === 'false' ||
        !isNaN(string)) 
        string = JSON.parse(string);
        
    return string;
  }

}

var versions = {
	"1.0.0": {
},
	"1.0.1": {
	storage: {
		account: "account"
	}
},
	"1.0.2": {
},
	"1.0.3": {
},
	"1.0.4": {
	gateway: {
		protocol: "leofcoin",
		port: 8080
	},
	api: {
		protocol: "leofcoin-api",
		port: 4000
	},
	services: [
		"disco-star",
		"disco-room"
	]
},
	"1.0.5": {
},
	"1.0.6": {
	discovery: {
		peers: [
			"IPv6/star.leofcoin.org/6000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp"
		]
	}
}
};

var version = "1.0.7";

var upgrade = async config => {
  const start = Object.keys(versions).indexOf(config.version);
  const end = Object.keys(versions).indexOf(version);
  // get array of versions to upgrade to
  const _versions = Object.keys(versions).slice(start, end + 1);
  
  // apply config for each greater version
  // until current version is applied
  for (const key of _versions) {
    const _config = versions[key];
    config = merge(config, _config);
    if (key === '1.0.1') {
      globalThis.accountStore = new LeofcoinStorage(config.storage.account);
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    config.version = key;
  }
  await configStore.put(config);
  return config;
};

var init = async _config => {
  globalThis.configStore = new LeofcoinStorage('config');
  
  let config = await configStore.get();
  
  if (!config || Object.keys(config).length === 0) {
    config = merge(DEFAULT_CONFIG, config);
    config = merge(config, _config);
    
    // private node configuration & identity
    await configStore.put(config);
    // by the public accessible account details
  }
  
  config = await upgrade(config);
  
  for (let path of Object.keys(config.storage)) {
    path = config.storage[path];
    const store = `${path}Store`;
    if (!globalThis[store]) globalThis[store] = new LeofcoinStorage(path);
  }
  
  return config;
};

class Peernet {
  constructor(discoRoom) {
    this.discoRoom = discoRoom;
    
    this.providerMap = new Map();
    return this
  }
  
  get clientMap() {
    return this.discoRoom.clientMap
  }
  
  get peerMap() {
    return this.discoRoom.peerMap
  }  
  
  async getDistance(provider) {
    const request = `https://tools.keycdn.com/geo.json?host=${provider.address}`;
    let response = await fetch(request);
    response = response.json();
    console.log(response);
  }
  
  async providersFor(hash) {
    let providers = this.providerMap.get(hash);
    if (!providers || providers.length === 0) {
      await this.walk(hash);
      providers = this.providerMap.get(hash);
    }
    
    let all = [];
    
    for (const provider of providers) {
      all.push(this.getDistance(provider));
    }
    
    all = await Promise.all(all);
    
    const closestPeer = all.reduce((p, c) => {
      if (c.distance < p || p === 0) return c;
    }, 0);
    
    // closestPeer
    // await connection()
  }
  
  async walk(hash) {
    // perform a walk but resolve first encounter
    if (hash) {
      for (const entry of this.clientMap.entries()) {
        console.log(entry);
        console.log(entry[1].client.protocol);
        const result = await entry[1].request({url: 'has', params: { hash }});
        console.log(result);
        if (result) {
          let providers = [];
          if (this.providerMap.has(hash)) {
            providers = this.providerMap.get(hash);
          }
          providers.push(entry[1]);
          this.providerMap.set(hash, providers);
          if (!this.walking) this.walk();
          return this.peerMap.get(entry[0])
        }
      }      
    }
    
    this.walking = true;    
    for (const entry of this.clientMap.entries()) {
      entry[0].request({url: 'ls', params: {}});
    }
    this.walking = false;
  }
   
  get(contentHash) {
    this.providersFor(contentHash);
    // this.closestPeer()
  }
  
  put() {
    // iam provider
  }
  
  has() {
    // fd
  }
  
  /**
   * Tries removing content from the network
   * although it tries hard to remove the content from the network, 
   * when you only have the location of that content.
   * see [why is my content still available](https://github.com/leofcoin/leofcoin-api/FAQ.md#why-is-my-content-still-available)
   */
  remove() {
    // TODO: only if private and owner
    // public ledgers should not be allowed to request removal.
    // instead data should be allowed to die out over time
    // providers[hash] = []
    // result: meltdown = null
    // FYI when your the only one providing that hash, it's gone!
    // Peernet only resolves locations to that content.
    // if your unlucky and your content was popular,
    // people could have pinned your content and it's now available forever,
    // that's until they decide to remove the content of course.
    // but surely you didn't put sensitive information on a public network,
    // did you?
    // But you encrypted it, right?
  }
}

class LeofcoinApi {
  constructor(options = { config: {}, init: true, start: true }) {
    if (!options.config) options.config = {};
    this.config = config;
    this.account = account;
    if (options.init) return this._init(options)
  }
  
  async _init({config, start}) {
    config = await init(config);
    if (!config.identity) {
      config.identity = await this.account.generateProfile();
      await configStore.put(config);
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    if (start) return this.start(config)
    return this;
  }
  
  async start(config = {}) {
    // spin up services
    if (config.services) for (let service of config.services) {
      try {
        service = await new Promise(function (resolve) { resolve(_interopNamespace(require(`./node_modules/${service}/${service}.js`))); });
        service = service.default;
        this[service] = await new service(config);
        console.log(`${service} ready`);
      } catch (e) {
        console.error(`${service} failed to start`);
      }
    }        
    this.peernet = new Peernet(this.discoRoom);
    // this.dht = new SimpleDHT(this.peernet)
  }
  // 
  // async request(multihash) {
  //   const providers = this.peernet.providers(multihash);
  //   const getFromClient = async (provider) => {
  //     const connection = await clientConnection(provider)
  //     return await connection.request({ url: 'get', params: { multihash }})
  //   }
  //   return await Promise.race([getFromClient(providers[0]), getFromClient(providers[1]]))    
  // }
  
  async pin(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    let data;
    try {
      data = await blockStore.get(hash);
    } catch (e) {
      data = await this.request(hash);
    }
    return this.put(hash, data)
  }
  
  async publish(hash, name) {
    if (!name) name = this.discoRoom.config.identity.peerId;
    name = this.keys[name];
    
    if (!name) this.keys[name] = this.createNameKey(name);
    
    this.peernet.provide(name, hash);
  }
  
  async resolve(name) {
    // check published bucket of all peers
    if (!this.keys[name]) throw `${name} name hasn't published any data or is offline`
    else resolve(name);
  }
  
  async get(hash) {
    const providers = await this.peernet.providersFor(hash);
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.get(hash)
  }
  
  async put(hash, data) {
    if (!hash || !data) throw expected(['hash: String', 'data: Object', 'data: String', 'data: Number', 'data: Boolean'], { hash, data })
    return await blockStore.put(hash, data)
  }
  
  async rm(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.remove(hash)
  }
  
  async ls(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.ls(hash)
  }
}

module.exports = LeofcoinApi;

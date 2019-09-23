'use strict';

let QRCode;

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

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
    peers: ['IPv6/star.leofcoin.org/6000/disco-room/'],
    // disco-star configuration see https://github.com/leofcoin/disco-star
    star: {
      protocol: 'disco-room',
      port: 6000
    }
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
  version: '1.0.1'
};

const expected = (expected, actual) => {
  const entries = Object.entries(actual)
    .map(entry => entry.join(!entry[1] ? `: undefined - ${entry[1]} ` : `: ${typeof entry[1]} - `));

  return `\nExpected:\n\t${expected.join('\n\t')}\n\nactual:\n\t${entries.join('\n\t')}`;
};

const merge = (object, source) => {
  for (const key of Object.keys(object)) {
    if (typeof object[key] === 'object' && source[key]) object[key] = merge(object[key], source[key]);
    else if(source[key] && typeof object[key] !== 'object') object[key] = source[key];
  }
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !object[key]) object[key] = merge(object[key], source[key]);
    else if (typeof source[key] !== 'object' && !object[key]) object[key] = source[key];
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

class LeofcoinStorage {

  constructor(path) {
    this.root = homedir();
    this.db = new LevelStore(join(this.root, '.leofcoin', path));
    // this.db = level(path, { prefix: 'lfc-'})
  }
  
  async many(type, _value) {    
    const jobs = [];
    
    for (const key of Object.keys(_value)) {
      let value;
      if (typeof _value[key] === 'object') value = JSON.stringify(_value[key]);
      else value = _value[key];
      
      jobs.push(this[type](key, value));
    }
    
    return Promise.all(jobs)
  }
  
  async put(key, value) {
    if (!value) return this.many('put', key);
    if (typeof value === 'object') value = JSON.stringify(value);
    
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
        string.charAt(0) === '[' && string.charAt(string.length - 1) === ']') 
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
}
};

var version = "1.0.3";

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

class LeofcoinApi {
  constructor(_config) {
    this.config = config;
    this.account = account;
    return this._init(_config)
  }
  
  async _init(_config = {}) {
    const config = await init(_config);
    if (!config.identity) {
      config.identity = await this.account.generateProfile();
      
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    return this;
  }
  
  
}

module.exports = LeofcoinApi;

'use strict';

let QRCode;

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var MultiWallet = _interopDefault(require('multi-wallet'));
var ip = _interopDefault(require('ip'));
var fetch = _interopDefault(require('node-fetch'));
var AES = _interopDefault(require('crypto-js/aes.js'));
require('crypto-js/enc-utf8.js');
var clientConnection = _interopDefault(require('socket-request-client'));
require('disco-peer-info');
var protons$1 = _interopDefault(require('@ipfn/protons'));
var DiscoHash$1 = _interopDefault(require('disco-hash'));
var DiscoCodec$1 = _interopDefault(require('disco-codec'));
var DiscoData = _interopDefault(require('disco-data'));
var DiscoDHTData = _interopDefault(require('disco-dht-data'));
var DiscoBus = _interopDefault(require('@leofcoin/disco-bus'));
var DiscoRoom = _interopDefault(require('disco-room'));
var protons$2 = _interopDefault(require('protons'));
var bs32$1 = _interopDefault(require('bs32'));
var bs58$1 = _interopDefault(require('bs58'));
var isHex$1 = _interopDefault(require('is-hex'));
var DiscoFolder = _interopDefault(require('disco-folder'));
var path = require('path');

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
};

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
};  

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
  version: '1.0.36'
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

const envConfig = () => {
  if (typeof window === 'undefined') {
    DEFAULT_CONFIG.discovery = DEFAULT_NODE_DISCOVERY_CONFIG;
  } else {
    DEFAULT_CONFIG.discovery = DEFAULT_BROWSER_DISCOVERY_CONFIG;
  }
  return DEFAULT_CONFIG;
};

const degreesToRadians = degrees => {
  return degrees * Math.PI / 180;
};

const distanceInKmBetweenEarthCoordinates = (lat1, lon1, lat2, lon2) => {
  var earthRadiusKm = 6371;

  var dLat = degreesToRadians(lat2-lat1);
  var dLon = degreesToRadians(lon2-lon1);

  lat1 = degreesToRadians(lat1);
  lat2 = degreesToRadians(lat2);
console.log(lat1, lat2);
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return earthRadiusKm * c;
};

const isDomain = address => {
  if (ip.toLong(address) === 0) return true;
  return false;
};

const parseAddress$1 = address => {
  const parts = address.split('/');
  if (isDomain(parts[0]) && isNaN(parts[1])) {
    return {
      address: parts[0],
      port: 8080,
      protocol: parts[1],
      peerId: parts[2]
    }
  }
  return {
    address: parts[0],
    port: Number(parts[1]),
    protocol: parts[2],
    peerId: parts[3]
  }
};

const lastFetched = {
  time: 0,
  address: undefined
};
const getAddress = async () => {
  let {address, time} = lastFetched;
  const now = Math.round(new Date().getTime() / 1000);
  if (now - time > 300) {
    address = await fetch('https://icanhazip.com/');
    address = await address.text();
    lastFetched.address = address;
    lastFetched.time = Math.round(new Date().getTime() / 1000);  
  }
  
  return address
};

const debug = text => {
  if (process.env.debug) {
    console.log(text);
  }
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
  const account = wallet.account(0);
  const external = account.external(0);
  return {
    mnemonic,
    publicKey: external.publicKey,
    privateKey: external.privateKey,
    peerId: external.id
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

  constructor(path, root = '.leofcoin') {
    this.root = homedir();
    if (readdirSync) try {
      readdirSync(join(this.root, root));
    } catch (e) {
      if (e.code === 'ENOENT') mkdirSync(join(this.root, root));
      else throw e
    }
    this.db = new LevelStore(join(this.root, root, path));
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
	"1.0.4": {
	gateway: {
		protocol: "leofcoin",
		port: 8585
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
	"1.0.9": {
	discovery: {
		star: {
			port: 5000
		}
	}
},
	"1.0.14": {
	discovery: {
	}
},
	"1.0.16": {
},
	"1.0.17": {
},
	"1.0.23": {
},
	"1.0.24": {
	discovery: {
		peers: [
			"star.leofcoin.org/5000/disco-room/3D1fftaVdwyzpmeSRPvgFGuvVo9v8QZKu1MfSSA1mRcxtfbUnt6KxW",
			"star.leofcoin.org/4000/leofcoin-api/3D1fftaVdwyzpmeSRPvgFGuvVo9v8QZKu1MfSSA1mRcxtfbUnt6KxW"
		],
		star: {
			protocol: "disco-room",
			interval: 10000,
			port: 5000
		}
	}
},
	"1.0.25": {
	discovery: {
		peers: [
			"star.leofcoin.org/5000/3D1fftaVdwyzpmeSRPvgFGuvVo9v8QZKu1MfSSA1mRcxtfbUnt6KxW/disco-star"
		]
	}
},
	"1.0.26": {
	discovery: {
	}
},
	"1.0.38": {
},
	"1.0.39": {
}
};

var version = "1.0.40-alpha.1";

var upgrade = async config => {
  const start = Object.keys(versions).indexOf(config.version);
  const end = Object.keys(versions).indexOf(version);
  // get array of versions to upgrade to
  const _versions = Object.keys(versions).slice(start, end);
  console.log({ver: versions[version]});
  // apply config for each greater version
  // until current version is applied
  for (const key of _versions) {
    const _config = versions[key];
    console.log(_config);
    config = merge(config, _config);
    if (key === '1.0.1') {
      globalThis.accountStore = new LeofcoinStorage(config.storage.account);
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    // if (key === '1.0.16' || key === '1.0.17' || key === '1.0.23' || key === '1.0.26') {
    const defaultConfig = envConfig();
    config.discovery = defaultConfig.discovery;
    // }
    config.version = key;
  }
  await configStore.put(config);
  return config;
};

var init = async _config => {
  globalThis.configStore = new LeofcoinStorage('config');
  
  let config = await configStore.get();
  if (!config || Object.keys(config).length === 0) {
    config = merge(envConfig(), config);
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

class DhtEarth {
  /**
   * 
   */
  constructor() {
    this.providerMap = new Map();
  }
  
  /**
   * 
   */
  async getCoordinates(provider) {
    const {address} = parseAddress$1(provider);
    console.log({address});
    const request = `http://ip-api.com/json/${address}`;
    let response = await fetch(request);
    response = await response.json();
    const { lat, lon } = response;
    return { latitude: lat, longitude: lon }
  }
  
  /**
   * 
   */
  async getDistance(peer, provider) {
    const { latitude, longitude } = await this.getCoordinates(provider.address);
    return {provider, distance: distanceInKmBetweenEarthCoordinates(peer.latitude,peer.longitude,latitude,longitude)}
  }
  
  /**
   * 
   */
  async closestPeer(providers) {
    let all = [];
    const address = await getAddress();
    const peerLoc = await this.getCoordinates(address);
    
    for (const provider of providers) {
      all.push(this.getDistance(peerLoc, provider));
    }
    
    all = await Promise.all(all);
    
    const closestPeer = all.reduce((p, c) => {
      console.log(c);
      if (c.distance < p || p === 0) return c.provider;
    }, 0);
    
    return closestPeer;
  }
  
  /**
   * 
   */
  async providersFor(hash) {
    return this.providerMap.get(hash);
  }  
  
  /**
   * 
   */  
  async addProvider(address, hash) {
    console.log({address, hash});
    let providers = [];
    if (this.providerMap.has(hash)) providers = this.providerMap.get(hash);
      
    providers = new Set([...providers, address]);
    this.providerMap.set(hash, providers);
    return providers;
  }
  
  
}

var proto = `// disco message
message DiscoMessage {
  required bytes data = 1;
  required bytes signature = 2;
  required string method = 3;
  optional string from = 4;
  optional string to = 5;
  optional string id = 6;
}`;

class DiscoMessage {
  constructor(data, options = {}) {
    if (!options.name) options.name = 'disco-message';
    this.name = options.name;
    this.proto = protons$1(proto);
    this.codecs = options.codecs;
    this.prefix = options.prefix;
    
    // TODO: check prefix
    if (Buffer.isBuffer(data) && this.prefix) {
      this._encoded = data;
    } else if (Buffer.isBuffer(data)) {
      this._buffer = data;
      this._create(data, this.name);
    } else if (typeof data === 'object') {
      this._decoded = {
        data: data.data,
        from: data.from,
        to: data.to
      };
    }
  }
  
  get discoHash() {
    return new DiscoHash$1(this.decoded, {name: this.name})
  }
  
  get hash() {
    return this.discoHash.digest.toString('hex')
  }
  
  get decoded() {
    return this._decoded || this.decode();
  }
  
  get encoded() {
    return this._encoded || this.encode();
  }
  
  _decode(encoded) {
    const discoCodec = new DiscoCodec$1(encoded.toString('hex'), this.codecs);
    encoded = encoded.slice(discoCodec.codecBuffer.length);
    this.name = discoCodec.name;
    const decoded = this.proto.DiscoMessage.decode(encoded);
    if (decoded.method) this.method = decoded.method;
    if (decoded.id) this.id = decoded.id;
    if (decoded.signature) this.signature = decoded.signature;
    return { from: decoded.from, to: decoded.to, data: decoded.data }
  }  
  
  _encode(decoded) {
    decoded.method = this.method  || 'get';
    decoded.id = this.id;
    return Buffer.concat([this.discoHash.discoCodec.codecBuffer, this.proto.DiscoMessage.encode(decoded)])
  }
  
  _create(object) {
    if (Buffer.isBuffer(object)) {
      object = JSON.parse(object.toString());
    }
    this._decoded = object;
  }
  
  decode() {
    if (this._encoded) this._decoded = this._decode(this._encoded);
    return this._decoded;
  }
  
  /**
   * @param {string} ['dm.sig'] - signature
   */
  encode(signature) {
    if (this._decoded) {
      this._decoded.signature = signature || 'dm.sig';
      if (!this.id) this.id = this.discoHash.toBs58();
      this._encoded = this._encode(this._decoded);
    }
    return this._encoded;
  }
  
  toHex() {
    return this._encoded.toString('hex')
  }
  
  fromHex(hex) {
    this._encoded = Buffer.from(hex, 'hex');
  }
}

class Peernet extends DiscoBus {
  constructor(discoRoom, protoCall) {
    super();
    this.dht = new DhtEarth();
    this.discoRoom = discoRoom;
    this.protocol = this.discoRoom.config.api.protocol;
    this.port = this.discoRoom.config.api.port;
    this.protoCall = protoCall;
    this.codecs = {
      'disco-dht': {
        codec: '6468',
        hashAlg: 'keccak-512'
      },
      'disco-data': {
        codec: '6464',
        hashAlg: 'keccak-512'
      }
    };
    this.discoRoom.subscribe('data', async data => {
      console.log('incoming');
      console.log({data});
      console.log(new DiscoCodec$1(data.toString('hex'), this.codecs));
      let message = new DiscoMessage();
      message._encoded = data;
      const decoded = message.decoded;
      
      const wallet = new MultiWallet('leofcoin:olivia');
      wallet.fromId(decoded.from);
      const signature = message.signature;
      const verified = wallet.verify(signature, message.discoHash.digest.slice(0, 32));
      if (!verified) console.warn(`ignored message from ${decoded.from}
        reason: invalid signature`);
        
      // console.log(decoded.data.toString());
      
      if (message.discoHash.name) {
        if (this.protoCall[message.discoHash.name] && this.protoCall[message.discoHash.name][message.method]) {          
          try {
            const peer = this.peerMap.get(message.decoded.from);
            const data = await this.protoCall[message.discoHash.name][message.method](message);
            if (data !== undefined) {
              message._decoded.data = data;
              message._decoded.to = message._decoded.from;
              message._decoded.from = this.discoRoom.peerId;
              const wallet = new MultiWallet('leofcoin:olivia');
              wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia');
              const signature = wallet.sign(message.discoHash.digest.slice(0, 32));
              message.encode(signature);
              peer.send(message.encoded);
            }
          } catch (e) {
            console.error(e);
          }
          
        } else { console.log(`unsupported protocol ${message.discoHash.name}`); }
        return
      }
    });
    return this
  }
  
  get providerMap() {
    return this.dht.providerMap
  }
  
  get clientMap() {
    return this.discoRoom.clientMap
  }
  
  get availablePeers() {
    return this.discoRoom.availablePeers
  }
  
  get peerMap() {
    return this.discoRoom.peerMap
  }
  
  get addProvider() {
    return this.dht.addProvider
  }
  
  async providersFor(hash) {
    let providers = await this.dht.providersFor(hash);
    if (!providers || providers.length === 0) {
      await this.walk(hash);
      providers = await this.dht.providersFor(hash);
      if (!providers || providers.length === 0) {
        await this.walk(hash);
        providers = await this.dht.providersFor(hash);
      }
    }
    return providers
  }
  
  
  
  async walk(hash) {
    // perform a walk but resolve first encounter
    console.log('walking');
      
    try {
      if (hash) {
        console.log({hash});
        const node = new DiscoDHTData({hash}, {codecs: this.codecs, name: 'disco-dht'});
        console.log(node.encode());
        const data = node.encoded;
        // console.log(node.decoded);
        console.log(data + 'node data');
        // console.log(node);
        const entries = this.peerMap.entries();
        for (const [peerID, peer] of entries) {
          console.log(peerID, peer);
          if (peer !== undefined) {
            const onerror = error => {
              console.log({error});
            };
            let result;
            try {
              console.log({peerID});
              
              let message = new DiscoMessage({ from: this.discoRoom.peerId, to: peerID, data }, {name: node.name, codecs: node.codecs });
              message.method = 'has';
              console.log(message.discoHash.name);
              const wallet = new MultiWallet('leofcoin:olivia');   
              wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia');
              const signature = wallet.sign(message.discoHash.digest.slice(0, 32));
              message.encode(signature);
              message = await peer.request(message);
              console.log({message});
              console.log('m result');
            } catch (error) {
              console.log({error});
            }
            console.log({result});
            if (result && result.value || typeof result === 'boolean' && result) {
              let providers = [];
              const address = this.peerMap.get(peerId).reduce((p, c) => {
                const {address, protocol} = parseAddress$1(c);
                if (protocol === this.protocol) return c
                return p
              }, null);
              this.addProvider(address, hash);
              return this.peerMap.get(address)
            }  
          }
          
        }      
      }
      
      this.walking = true;    
      for (const [peerID, clients] of this.clientMap.entries()) {
        const client = clients[this.protocol];
        if (client) await client.request({url: 'ls', params: {}});
        // TODO: 
      }
      this.walking = false;
    } catch (e) {
      console.error(e);
    }
  }
   
  async get(hash) {
    console.log({hash});
    let providers = await this.providersFor(hash);
    
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`
    console.log({providers});
    const closestPeer = await this.dht.closestPeer(providers);
    console.log({closestPeer});
    // const { protocol, port, address, peerId } = parseAddress(closestPeer)    
    let peer;
    if (this.peerMap.has(closestPeer.peerId)) {
      peer = this.peerMap.get(closestPeer.peerId);
    } else {
      peer = this.discoRoom.dial(closestPeer);
    }
    const codec = new DiscoCodec$1(hash);
    const node = new DiscoData();
    node.create({ hash });
    node.encode();
    const data = node.encoded;
    let message = new DiscoMessage({
      from: this.discoRoom.peerId, 
      to: closestPeer.peerId,
      data 
    }, {
      name: node.name,
      codecs: node.codecs
    });
    message.method = 'get';
    const wallet = new MultiWallet('leofcoin:olivia');   
    wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia');
    const signature = wallet.sign(message.discoHash.digest.slice(0, 32));
    message.encode(signature);
    console.log({message}, 'sending');
    try {
      message = await peer.request(message);
    } catch (e) {
      console.error({e});
    }
    providers = await this.providersFor(hash);
    // console.log({message});
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`;
    return globalThis.blocksStore.get(hash)
    
// a request is client.on & client.send combined
    
    
    // connection.send({url: 'get'})
    // this.closestPeer()
  }
  
  async route(hash, type = 'has') {
    const peers = [];
    let peer;
    for (const peer of  this.discoRoom.peerMap.values()) {
      peers.push(peer);
    }
    if (peers.length === 0) {
      for (const peer of  this.discoRoom.availablePeers.values()) {
        peers.push(peer);
      }  
      if (peers.length > 0) peer = await this.discoRoom.dial(peers[0]);
      peer = peer.peer;
      
    }
    peer.on('data', data => {
      console.log(data);
    });
    peer.send(JSON.stringify({
      method: 'has',
      hash
    }));
    const protocol = this.protocol;
    for (const [peerId, clients] of this.clientMap.entries()) {      
      let client = clients[protocol];
      if (!client) {
        if (this.peerMap.has(peerId)) {
          const protoAddress = this.peerMap.get(peerId).reduce((p, c) => {
            const {address, protocol} = parseAddress$1(c);
            if (protocol === this.protocol) return c
            return p
          }, null);
          const { port, address, protocol } = parseAddress$1(protoAddress);
          client = await clientConnection({ port, address, protocol });
        }
      }
      // if (!client) client = protocols['disco-room']
      // console.log({client, clients});
      if (peerId !== this.discoRoom.peerId && client) {
        let result = await client.request({url: 'route', params: { type, protocol, hash, peerId: this.discoRoom.peerId, from: this.discoRoom.peerId }});  
        
        const address = result.addressBook.reduce((p, c) => {
          const {address, protocol} = parseAddress$1(c);
          if (protocol === this.protocol) return c
          return p
        }, null);
        
        if (type === 'has') {
          if (result.has) {
            this.addProvider(address, hash);
          }
        } else if (type === 'get') {
          if (result.value) {
            this.addProvider(address, hash);
          }
          
        }
        
        console.log({ result });
        return result.value
      }
      
      
    }
    return
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

function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var protons = _interopDefault$1(protons$2);
var DiscoHash = _interopDefault$1(DiscoHash$1);
var bs32 = _interopDefault$1(bs32$1);
var bs58 = _interopDefault$1(bs58$1);
var isHex = _interopDefault$1(isHex$1);
var DiscoCodec = _interopDefault$1(DiscoCodec$1);

var proto$1 = `// disco link
message DiscoLink {
  required string hash = 1;
  optional string name = 2;
}
// disco folder
message DiscoFolder {
  required string name = 1;
  repeated DiscoLink links = 2;
  optional bool response = 3;
}`;

class FormatInterface {
  constructor(buffer, proto) {    
    this.protoEncode = proto.encode;
    this.protoDecode = proto.decode;
    
    if (Buffer.isBuffer(buffer)) {
      const codec = new DiscoCodec(buffer);
      
      if (codec.name) {
        this.codecName = codec.name;
        this.encoded = buffer; 
        this.decode();
      } else {
        this.decoded = buffer;
        this.encode(buffer);
      }      
    } else if (typeof buffer === 'string') {
      if (isHex(buffer)) this.fromHex(buffer);
      else if (bs32.test(buffer)) this.fromBs32(buffer);
      else this.fromBs58(buffer); 
    }
  }
    
  decode(encoded) {
    if (!encoded) encoded = this.encoded;
    const discoCodec = new DiscoCodec(encoded.toString('hex'));
    encoded = encoded.slice(discoCodec.codecBuffer.length);
    this.codecName = discoCodec.name;
    this.decoded = this.protoDecode(encoded);
    return this.decoded
  }
  
  encode(decoded) {    
    if (!decoded) decoded = this.decoded;
    const codec = new DiscoCodec(this.codecName);
    this.encoded = Buffer.concat([codec.codecBuffer, this.protoEncode(decoded)]);
    return this.encoded
  }
  
  fromHex(hex) {
    this.encoded = Buffer.from(hex, 'hex');
    this.decode();
  }  
  
  fromBs32(input) {
    this.encoded = bs32.decode(input);
    this.decode();
  }
  
  fromBs58(input) {
    this.encoded = bs58.decode(input);
    this.decode();
  }
  
  toHex() {
    if(!this.encoded) this.encode();
    return this.encoded.toString('hex')
  }
  
  toBs32() {    
    if(!this.encoded) this.encode();
    return bs32.encode(this.encoded)
  }
  
  toBs58() {    
    if(!this.encoded) this.encode();
    return bs58.encode(this.encoded)
  }
  
  create(data) {
    if (Buffer.isBuffer(data)) {
      data = JSON.parse(data.toString());
    }
    this.decoded = data;
  }
}

class DiscoLink extends FormatInterface {
  constructor(buffer) {
    super(buffer, protons(proto$1).DiscoLink);
    this.codecName = 'disco-link';
  }
  
  get discoHash() {
    return new DiscoHash(this.data, { name: this.codecName })
  }
  
  decode() {
    super.decode();
    this.data = this.decoded.data;
    this.hash = this.decoded.hash;
  }
  
  encode() {
    this.decoded = {
      data: this.data,
      hash: this.hash
    };
    super.encode();
  }
  
  create(data) {
    if (Buffer.isBuffer(data)) {
      data = JSON.parse(data.toString());
    }
    this.data = data.data;
    this.hash = data.hash;
    
    this.decoded = this.data;
    if (!this.hash) this.hash = this.discoHash.toBs58();
    
  }
}

var link = DiscoLink;

class LeofcoinApi extends DiscoBus {
  get connectionMap() {
    console.log(this.discoRoom.connectionMap.entries());
    return this.discoRoom.connectionMap
  }
  get peerMap() {
    return this.discoRoom.peerMap
  }
  constructor(options = { config: {}, init: true, start: true }) {
    super();
    if (!options.config) options.config = {};
    this.config = config;
    this.account = account;
    console.log(options.init);
    if (options.init) return this._init(options)
  }
  
  async _init({config, start}) {
    config = await init(config);
    if (!config.identity) {
      config.identity = await this.account.generateProfile();
      await configStore.put(config);
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    if (start) await this.start(config);
    return this;
  }
  
  async start(config = {}) {
    // spin up services    
    this.address = await getAddress();
    Object.defineProperty(this, 'peerId', {
      value: config.identity.peerId,
      writable: false
    });    
    
    this.discoRoom = await new DiscoRoom(config);
    
    
    this.peernet = new Peernet(this.discoRoom, {
      'disco-dht': {
        has: async message => {
          try {
            const node = new DiscoDHTData();
            console.log(message.decoded.data);
            node._encoded = message.decoded.data;
            node.decode();
            console.log(await globalThis.blocksStore.has(node.decoded.data.hash.toString()));
            console.log(node.decoded);
            const data = node.decoded.data;
            console.log(node.decoded.data.hash);
              console.log(data.value);
              console.log(data.hash.toString());
            if (data.value) {
              console.log(data.value);
              const info = this.discoRoom.availablePeers.get(message.decoded.from);
              this.peernet.addProvider(info, data.hash.toString());
              return undefined
            } else {
              
              const has = await globalThis.blocksStore.has(node.decoded.data.hash.toString());
              console.log({has});
              console.log(node.encoded);
              node._decoded.data.value = has;
              node.encode();
              return node.encoded
            }
          } catch (e) {
            console.error(e);
          }
          
          
        },
        in: () => {
          
        },
        out: () => {
          
        }
      },
      'lfc-block': {
        put: message => {
          const hash = message.discoHash.toString('hex');
          if (!globalThis.blocksStore.has(hash)) {
            globalThis.blocksStore.set(hash, message.encoded);
            debug(`Added block ${hash}`);
          }
          
        },
        get: message => {
          const hash = message.discoHash.toString('hex');
          if (globalThis.blocksStore.has(hash)) {
            return globalThis.blocksStore.get(hash)
          }
        }
      },
      'disco-data': {
        get: async message => {
          console.log('decode');
          const node = new DiscoData(message.decoded.data);
          node.decode();
          console.log(node);
          if (!node.response) {
            const data = await blocksStore.get(node.hash.toString());
            console.log(data);
            node.data = data.data ? Buffer.from(data.data) : data;
            node.response = true;
            console.log('encode');
            node.encode();
            console.log(node);
            return node.encoded
          } else {
            await this.put(node.hash.toString(), node.data.toString());
            return undefined
          }
          // return this.get(message.decoded)
        },
        put: message => {
          
        }
      }
    });
    
    
  
    return
      // this.dht = new SimpleDHT(this.peernet)
  }
  
  routedRequest(connection, message, response) {
      const messageId = uuid();
      
      const data = JSON.stringify({
        url: 'route',
        status: 200,
        value: message,
        id: messageId,
        customMessage: true
      });
      
      const onmessage = message => {
        console.log({message});
        let data;
        if (message.type) {
          switch (message.type) {
            case 'binary':
              data = message.binaryData.toString();
              break;
            case 'utf8':
              data = message.utf8Data;
              break;
          }
        }
        const { route, params, url, id } = JSON.parse(data);          
        if (id === messageId) {
          response.send(data);
          connection.removeListener('message', onmessage);
        }
      };
      connection.on('message', onmessage);
      connection.send(data);
    }
    
    /**
     * Route data between nodes who can't connect to each other.
     */
    async _onRoute(message, response) {
      console.log({message});
      if (message.to && this.connectionMap.has(message.to)) {
        const { addressBook, connection } = this.connectionMap.get(message.to);
        const address = addressBook.reduce((c, p) => {
          const {protocol} = parseAddress(c);
          if (protocol === message.protocol) return c;
          return p;
        }, null);
        if (address) await this.discoRoom.dialPeer(address);
        // if (!Array.isArray(message.from)) message.from = [message.from]      
        // message.from = [...message.from, this.peerId]
        this.routedRequest(connection, message, response);
      } else if (!this.connectionMap.has(message.to)) {
        message.from = this.peerId;
        for (const [peerId, {connection}] of this.connectionMap.entries()) {        
          message.to = peerId;
          this.routedRequest(connection, message, response); 
        }
      } else {
        console.warn('unimplemented behavior');
        // TODO: search for peer
      }
      
      
    }
  
  _onhas(params, response) {
    console.log(params);
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
      data = await blocksStore.get(hash);
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
    let data;
    if (!hash) throw expected(['hash: String'], { hash })
    try {
      data = await globalThis.blocksStore.get(hash);
      const codec = new DiscoCodec$1();
      codec.fromBs58(data);
      if (codec.name === 'disco-folder') {
        const folder = new DiscoFolder();
        folder.fromBs58(data);
        return folder.decoded
      }
    } catch (e) {
      if (!data) {
        const providers = await this.peernet.providersFor(hash);
        console.log({providers});
        data = await this.peernet.get(hash);
        console.log({data});
        const codec = new DiscoCodec$1();
        codec.fromBs58(data);
        if (codec.name === 'disco-folder') {
          const folder = new DiscoFolder();
          folder.fromBs58(data);
          return folder.decoded
        }
        if (data) return data;
        // blocksStore.put(hash, data)
        if (providers && providers.length > 0) {
          data = this.peernet.get(hash);
          console.log(data);
          await blocksStore.put(hash, data);
        }
        
      }  
    }
    
    
    return data
  }
  
  async put(hash, data) {
    if (!hash || !data) throw expected(['hash: String', 'data: Object', 'data: String', 'data: Number', 'data: Boolean'], { hash, data })
    return await blocksStore.put(hash, data)
  }
  
  async rm(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blocksStore.delete(hash)
  }
  
  async ls(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blocksStore.ls(hash)
  }
  
  async _addFolder(folder, links) {
    const input = document.createElement('input');
    input.webkitdirectory = true;
    input.directory = true;
    input.multiple = true;
    input.type = 'file';
    const change = new Promise((resolve, reject) => {
      input.onchange = async () => {
        const jobs = [];
        console.log(input.files);
        let size = 0;
        let name;
        for (const file of input.files) {
          size += file.size;
          if (!name) {
            name = file.webkitRelativePath.match(/^(\w*)/g)[0];
            console.log(name);
          }
          jobs.push(new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ({target}) => resolve({name: file.name, data: target.result});
            reader.readAsArrayBuffer(file);
          }));
        }
        const result = await Promise.all(jobs);
        console.log(result);
        const _links = [];
        for await (const { name, data } of result) {
          // await api.put()
          const link$1 = new link();
          console.log(name, data);
          link$1.create({name, data});
          link$1.encode();
          const hash = link$1.discoHash.toBs58();
          await this.put(hash, data);
          _links.push({name, hash});
        }
        const discoFolder = new DiscoFolder();
        console.log(discoFolder);
        discoFolder.create({name, links: _links});
        console.log(discoFolder);
        discoFolder.encode();
        const folderHash = discoFolder.discoHash.toBs58();
        await this.put(folderHash, discoFolder.toBs58());
        // console.log(result);
        resolve(folderHash);
      };
    });
    document.head.appendChild(input);
    input.click();
    return await change
    // await this.put(folderHash, _links)
    // return folderHash
  }
  
  async addFolder(folder, links) {
    if (typeof window !== 'undefined') {
      return await this._addFolder(folder, links)
    }
    const fs = require('fs');
    const { promisify } = require('util');
    const readdir = promisify(fs.readdir);
    const readFile = promisify(fs.readFile);
    const files = await readdir(folder);
    const _links = [];
    for await (const path$1 of files) {
      const data = await readFile(path.join(folder, path$1));
      const discoLink = new link();
      discoLink.create({name: path$1, data});
      _links.push({name: path$1, hash: discoLink.discoHash.toBs58()});
    }
    const discoFolder = new DiscoFolder();
    discoFolder.create({name: folder, links: _links});
    discoFolder.encode();
    const folderHash = discoFolder.discoHash.toBs58();
    await this.put(folderHash, discoFolder.toBs58());
    return folderHash
  }
}

module.exports = LeofcoinApi;

'use strict';

let QRCode;

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var MultiWallet = _interopDefault(require('multi-wallet'));
var ip = _interopDefault(require('ip'));
var fetch = _interopDefault(require('node-fetch'));
var AES = _interopDefault(require('crypto-js/aes.js'));
require('crypto-js/enc-utf8.js');
var clientConnection = _interopDefault(require('socket-request-client'));
var DiscoStar = _interopDefault(require('disco-star'));
var DiscoRoom = _interopDefault(require('disco-room'));
var DiscoServer = _interopDefault(require('disco-server'));

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
    peers: ['star.leofcoin.org/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'],
    // disco-star configuration see https://github.com/leofcoin/disco-star
    star: {
      protocol: 'disco-room',
      port: 8080
    }
};

const DEFAULT_NODE_DISCOVERY_CONFIG = {
  // peer addresses to discover other peers
  peers: ['star.leofcoin.org/5000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'],
  // disco-star configuration see https://github.com/leofcoin/disco-star
  star: {
    protocol: 'disco-room',
    interval: 10000,
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
  version: '1.0.9'
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

const parseAddress = address => {
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
}
};

var version = "1.0.24";

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
    if (key === '1.0.16' || key === '1.0.17' || key === '1.0.23') {
      const defaultConfig = envConfig();
      config.discovery = defaultConfig.discovery;
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
    const {address} = parseAddress(provider);
    console.log({address});
    const request = `https://tools.keycdn.com/geo.json?host=${address}`;
    let response = await fetch(request);
    response = await response.json();
    console.log(response);
    const { latitude, longitude } = response.data.geo;
    return { latitude, longitude }
  }
  
  /**
   * 
   */
  async getDistance(peer, provider) {
    const { latitude, longitude } = await this.getCoordinates(provider);
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
    let providers = [];
    if (this.providerMap.has(hash)) providers = this.providerMap.get(hash);
      
    providers = new Set([...providers, address]);
    this.providerMap.set(hash, providers);
    return providers;
  }
  
  
}

class Peernet {
  constructor(discoRoom) {    
    this.dht = new DhtEarth();
    this.discoRoom = discoRoom;
    this.protocol = this.discoRoom.config.api.protocol;
    this.port = this.discoRoom.config.api.port;
    
    return this
  }
  
  get providerMap() {
    return this.dht.providerMap
  }
  
  get clientMap() {
    return this.discoRoom.clientMap
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
        await this.route(hash, 'has');
        providers = await this.dht.providersFor(hash);
      }
    }
    return providers
  }
  
  async walk(hash) {
    // perform a walk but resolve first encounter
    if (hash) {
      for (const [peerID, clients] of this.clientMap.entries()) {
        const client = clients[this.protocol];
        console.log(client);
        if (client !== undefined) {
          const result = await client.request({url: 'has', params: { hash }});
          console.log({result});
          if (result && result.value || typeof result === 'boolean' && result) {
            const address = this.peerMap.get(peerId).reduce((p, c) => {
              const {address, protocol} = parseAddress(c);
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
  }
   
  async get(hash) {
    let providers = await this.providersFor(hash);
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`
    const closestPeer = await this.dht.closestPeer(providers);
    console.log({closestPeer});
    const { protocol, port, address, peerId } = parseAddress(closestPeer);    
    let client;
    if (this.clientMap.has(peerId)) {
      client = this.clientMap.get(peerId);
      client = client[protocol];
    }
    
    if (!client) {
       try {
         client = await clientConnection({port, protocol, address});  
       } catch (e) {
         this.route(hash, 'get');
         console.log({e});
         return
       } finally {
         
       }
    }
    
    if (client) {
      const data = {url: 'get', params: {hash}};
      try {
        const requested = await client.request(data);
      } catch (e) {
        console.log({e});
      }
      console.log({requested});  
    }
// a request is client.on & client.send combined
    
    
    // connection.send({url: 'get'})
    // this.closestPeer()
  }
  
  async route(hash, type = 'has') {
    console.log({hash});
    const protocol = this.protocol;
    for (const [peerId, clients] of this.clientMap.entries()) {      
      let client = clients[protocol];
      if (!client) client = clients['disco-room'];
      console.log({client, clients});
      if (peerId !== this.discoRoom.peerId && client) {
        let result = await client.request({url: 'route', params: { type, protocol, hash, peerId: this.discoRoom.peerId, from: this.discoRoom.peerId }});  
        
        const address = result.addressBook.reduce((p, c) => {
          const {address, protocol} = parseAddress(c);
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

class LeofcoinApi {
  constructor(options = { config: {}, init: true, start: true }) {
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
    
    const addressBook = [];
    if (config.discovery.star) addressBook.push(`${this.address}/${config.discovery.star.port}/${config.discovery.star.protocol}/${this.peerId}`);
    if (config.api) addressBook.push(`${this.address}/${config.api.port}/${config.api.protocol}/${this.peerId}`);
    if (config.gateway) addressBook.push(`${this.address}/${config.gateway.port}/${config.gateway.protocol}/${this.peerId}`);
    
    this.addressBook = addressBook;
    
    if (config.discovery.star) {
      try {
        this.discoStar = await new DiscoStar({
          port: config.discovery.star.port,
          protocol: config.discovery.star.protocol,
          peerId: config.identity.peerId,
          protocols: [
            config.api,
            config.gateway  
          ]
        });
        if (!this.discoStar) addressBook.shift();
        
        // this.apiServer = await new ApiServer(config)
      } catch (e) {
        console.warn(`failed loading disco-star`);
        // remove disco-star from addressBook
        addressBook.shift();
      }    
      
      Object.defineProperty(this, 'addressBook', {
        value: addressBook,
        writable: false
      });
      await new DiscoServer(config.api);
      this.discoRoom = await new DiscoRoom(config);
      this.peernet = new Peernet(this.discoRoom, this.discoStar);
      return
      // this.dht = new SimpleDHT(this.peernet)
    }
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
      data = await globalThis.blocksStore.get(hash + 'e');
      console.log({data});
    } catch (e) {
      if (!data) {
        const providers = await this.peernet.providersFor(hash);
        console.log({providers});
        if (providers && providers.length > 0) {
          data = this.peernet.get(hash);
          console.log(data);
          blocksStore.put(hash, data);
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
    return await blocksStore.remove(hash)
  }
  
  async ls(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blocksStore.ls(hash)
  }
}

module.exports = LeofcoinApi;

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var MultiWallet = _interopDefault(require('multi-wallet'));
var ip = _interopDefault(require('ip'));
var fetch = _interopDefault(require('node-fetch'));
var AES = _interopDefault(require('crypto-js/aes.js'));
require('crypto-js/enc-utf8.js');
var clientConnection = _interopDefault(require('socket-request-client'));
var DiscoMessage = _interopDefault(require('disco-message'));
var DiscoRoom = _interopDefault(require('disco-room'));

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
    peers: ['star.leofcoin.org/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp/disco-star',],
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
  peers: ['star.leofcoin.org/5000/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp/disco-star'],
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

  if (!window.QRCode) {
        const imported = await Promise.resolve().then(function () { return qrcode$1; });
        window.QRCode = imported.default;
      }
  
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
},
	"1.0.24": {
	discovery: {
		peers: [
			"star.leofcoin.org/5000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp",
			"star.leofcoin.org/4000/leofcoin-api/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp"
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
			"star.leofcoin.org/5000/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp/disco-star"
		]
	}
},
	"1.0.26": {
	discovery: {
	}
}
};

var version = "1.0.33";

var upgrade = async config => {
  const start = Object.keys(versions).indexOf(config.version);
  const end = Object.keys(versions).indexOf(version);
  // get array of versions to upgrade to
  const _versions = Object.keys(versions).slice(start, end + 1);
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
    if (key === '1.0.16' || key === '1.0.17' || key === '1.0.23' || key === '1.0.26') {
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
    const {address} = parseAddress$1(provider);
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
  constructor(discoRoom, protoCall) {
    this.dht = new DhtEarth();
    this.discoRoom = discoRoom;
    this.protocol = this.discoRoom.config.api.protocol;
    this.port = this.discoRoom.config.api.port;
    this.protoCall = protoCall;
    
    this.discoRoom.on('data', data => {
      console.log('incoming');
      console.log({data});
      
      let message = new DiscoMessage();
      message._encoded = data;
      const decoded = message.decode();
      console.log({decoded});
      const wallet = new MultiWallet('leofcoin:olivia');
      console.log(decoded.from);
      wallet.fromId(decoded.from);
      console.log(decoded);
      const signature = decoded.signature;
      delete decoded.signature;
      message = new DiscoMessage(decoded);
      const verified = wallet.verify(signature, message.discoHash.digest.slice(0, 32));
      if (!verified) console.warn(`ignored message from ${decoded.from}
        reason: invalid signature`);
        
      console.log(decoded.data);
      
      if (message.discoHash.name) {
        if (this.protoCall[message.discoHash.name] && this.protoCall[message.discoHash.name][message.method]) this.protoCall[message.discoHash.name][message.method](message.decoded);
        else console.log(`unsupported protocol ${message.discoHash.name}`);
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
    console.log(this.peerMap);
    console.log(this.availablePeers);
    
    if (hash) {
      for (const [peerID, peer] of this.peerMap.entries()) {
        console.log(peer);
        if (peer !== undefined) {
          let result;
          try {
            let message = new DiscoMessage({ from: this.discoRoom.peerId, to: peerID, data: Buffer.from(hash) }, {method: 'has', name: 'disco-data', codecs: {
      'disco-data': {
        codec: '6464',
        hashAlg: 'keccak-512'
      }
    }});
            const wallet = new MultiWallet('leofcoin:olivia');
            wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia');
            const signature = wallet.sign(message.discoHash.digest.slice(0, 32));
            message.encode(signature);
            message = await peer.request(message);
            console.log({message});
          } catch (error) {
            console.log({error});
          } finally {
            
          }
          console.log({result});
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
    console.log({hash});
    let providers = await this.providersFor(hash);
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`
    const closestPeer = await this.dht.closestPeer(providers);
    console.log({closestPeer});
    const { protocol, port, address, peerId } = parseAddress$1(closestPeer);    
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
    console.log(this.discoRoom.availablePeers);
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
    console.log({peer, peers});
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

class LeofcoinApi {
  get connectionMap() {
    console.log(this.discoRoom.connectionMap.entries());
    return this.discoRoom.connectionMap
  }
  get peerMap() {
    return this.discoRoom.peerMap
  }
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
    
    this.discoRoom = await new DiscoRoom(config);
    this.peernet = new Peernet(this.discoRoom, {
      'disco-data': {
        has: message => {
          const hash = message.discoHash.toString('hex');
          console.log(message);
          return globalThis.blocksStore.has(hash)
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

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var qrcode = createCommonjsModule(function (module, exports) {
!function(t){module.exports=t();}(function(){return function(){function t(r,e,n){function o(u,a){if(!e[u]){if(!r[u]){var f="function"==typeof commonjsRequire&&commonjsRequire;if(!a&&f)return f(u,!0);if(i)return i(u,!0);var s=new Error("Cannot find module '"+u+"'");throw s.code="MODULE_NOT_FOUND",s}var h=e[u]={exports:{}};r[u][0].call(h.exports,function(t){return o(r[u][1][t]||t)},h,h.exports,t,r,e,n);}return e[u].exports}for(var i="function"==typeof commonjsRequire&&commonjsRequire,u=0;u<n.length;u++)o(n[u]);return o}return t}()({1:[function(t,r,e){r.exports=function(){return "function"==typeof Promise&&Promise.prototype&&Promise.prototype.then};},{}],2:[function(t,r,e){var n=t("./utils").getSymbolSize;e.getRowColCoords=function(t){if(1===t)return [];for(var r=Math.floor(t/7)+2,e=n(t),o=145===e?26:2*Math.ceil((e-13)/(2*r-2)),i=[e-7],u=1;u<r-1;u++)i[u]=i[u-1]-o;return i.push(6),i.reverse()},e.getPositions=function(t){for(var r=[],n=e.getRowColCoords(t),o=n.length,i=0;i<o;i++)for(var u=0;u<o;u++)0===i&&0===u||0===i&&u===o-1||i===o-1&&0===u||r.push([n[i],n[u]]);return r};},{"./utils":21}],3:[function(t,r,e){function n(t){this.mode=o.ALPHANUMERIC,this.data=t;}var o=t("./mode"),i=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];n.getBitsLength=function(t){return 11*Math.floor(t/2)+t%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r;for(r=0;r+2<=this.data.length;r+=2){var e=45*i.indexOf(this.data[r]);e+=i.indexOf(this.data[r+1]),t.put(e,11);}this.data.length%2&&t.put(i.indexOf(this.data[r]),6);},r.exports=n;},{"./mode":14}],4:[function(t,r,e){function n(){this.buffer=[],this.length=0;}n.prototype={get:function(t){var r=Math.floor(t/8);return 1==(this.buffer[r]>>>7-t%8&1)},put:function(t,r){for(var e=0;e<r;e++)this.putBit(1==(t>>>r-e-1&1));},getLengthInBits:function(){return this.length},putBit:function(t){var r=Math.floor(this.length/8);this.buffer.length<=r&&this.buffer.push(0),t&&(this.buffer[r]|=128>>>this.length%8),this.length++;}},r.exports=n;},{}],5:[function(t,r,e){function n(t){if(!t||t<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=o.alloc(t*t),this.reservedBit=o.alloc(t*t);}var o=t("../utils/buffer");n.prototype.set=function(t,r,e,n){var o=t*this.size+r;this.data[o]=e,n&&(this.reservedBit[o]=!0);},n.prototype.get=function(t,r){return this.data[t*this.size+r]},n.prototype.xor=function(t,r,e){this.data[t*this.size+r]^=e;},n.prototype.isReserved=function(t,r){return this.reservedBit[t*this.size+r]},r.exports=n;},{"../utils/buffer":28}],6:[function(t,r,e){function n(t){this.mode=i.BYTE,this.data=o.from(t);}var o=t("../utils/buffer"),i=t("./mode");n.getBitsLength=function(t){return 8*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){for(var r=0,e=this.data.length;r<e;r++)t.put(this.data[r],8);},r.exports=n;},{"../utils/buffer":28,"./mode":14}],7:[function(t,r,e){var n=t("./error-correction-level"),o=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];e.getBlocksCount=function(t,r){switch(r){case n.L:return o[4*(t-1)+0];case n.M:return o[4*(t-1)+1];case n.Q:return o[4*(t-1)+2];case n.H:return o[4*(t-1)+3];default:return}},e.getTotalCodewordsCount=function(t,r){switch(r){case n.L:return i[4*(t-1)+0];case n.M:return i[4*(t-1)+1];case n.Q:return i[4*(t-1)+2];case n.H:return i[4*(t-1)+3];default:return}};},{"./error-correction-level":8}],8:[function(t,r,e){function n(t){if("string"!=typeof t)throw new Error("Param is not a string");switch(t.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+t)}}e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2},e.isValid=function(t){return t&&void 0!==t.bit&&t.bit>=0&&t.bit<4},e.from=function(t,r){if(e.isValid(t))return t;try{return n(t)}catch(t){return r}};},{}],9:[function(t,r,e){var n=t("./utils").getSymbolSize;e.getPositions=function(t){var r=n(t);return [[0,0],[r-7,0],[0,r-7]]};},{"./utils":21}],10:[function(t,r,e){var n=t("./utils"),o=n.getBCHDigit(1335);e.getEncodedBits=function(t,r){for(var e=t.bit<<3|r,i=e<<10;n.getBCHDigit(i)-o>=0;)i^=1335<<n.getBCHDigit(i)-o;return 21522^(e<<10|i)};},{"./utils":21}],11:[function(t,r,e){var n=t("../utils/buffer"),o=n.alloc(512),i=n.alloc(256);!function(){for(var t=1,r=0;r<255;r++)o[r]=t,i[t]=r,256&(t<<=1)&&(t^=285);for(r=255;r<512;r++)o[r]=o[r-255];}(),e.log=function(t){if(t<1)throw new Error("log("+t+")");return i[t]},e.exp=function(t){return o[t]},e.mul=function(t,r){return 0===t||0===r?0:o[i[t]+i[r]]};},{"../utils/buffer":28}],12:[function(t,r,e){function n(t){this.mode=o.KANJI,this.data=t;}var o=t("./mode"),i=t("./utils");n.getBitsLength=function(t){return 13*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r;for(r=0;r<this.data.length;r++){var e=i.toSJIS(this.data[r]);if(e>=33088&&e<=40956)e-=33088;else{if(!(e>=57408&&e<=60351))throw new Error("Invalid SJIS character: "+this.data[r]+"\nMake sure your charset is UTF-8");e-=49472;}e=192*(e>>>8&255)+(255&e),t.put(e,13);}},r.exports=n;},{"./mode":14,"./utils":21}],13:[function(t,r,e){function n(t,r,n){switch(t){case e.Patterns.PATTERN000:return (r+n)%2==0;case e.Patterns.PATTERN001:return r%2==0;case e.Patterns.PATTERN010:return n%3==0;case e.Patterns.PATTERN011:return (r+n)%3==0;case e.Patterns.PATTERN100:return (Math.floor(r/2)+Math.floor(n/3))%2==0;case e.Patterns.PATTERN101:return r*n%2+r*n%3==0;case e.Patterns.PATTERN110:return (r*n%2+r*n%3)%2==0;case e.Patterns.PATTERN111:return (r*n%3+(r+n)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}}e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var o={N1:3,N2:3,N3:40,N4:10};e.isValid=function(t){return null!=t&&""!==t&&!isNaN(t)&&t>=0&&t<=7},e.from=function(t){return e.isValid(t)?parseInt(t,10):void 0},e.getPenaltyN1=function(t){for(var r=t.size,e=0,n=0,i=0,u=null,a=null,f=0;f<r;f++){n=i=0,u=a=null;for(var s=0;s<r;s++){var h=t.get(f,s);h===u?n++:(n>=5&&(e+=o.N1+(n-5)),u=h,n=1),h=t.get(s,f),h===a?i++:(i>=5&&(e+=o.N1+(i-5)),a=h,i=1);}n>=5&&(e+=o.N1+(n-5)),i>=5&&(e+=o.N1+(i-5));}return e},e.getPenaltyN2=function(t){for(var r=t.size,e=0,n=0;n<r-1;n++)for(var i=0;i<r-1;i++){var u=t.get(n,i)+t.get(n,i+1)+t.get(n+1,i)+t.get(n+1,i+1);4!==u&&0!==u||e++;}return e*o.N2},e.getPenaltyN3=function(t){for(var r=t.size,e=0,n=0,i=0,u=0;u<r;u++){n=i=0;for(var a=0;a<r;a++)n=n<<1&2047|t.get(u,a),a>=10&&(1488===n||93===n)&&e++,i=i<<1&2047|t.get(a,u),a>=10&&(1488===i||93===i)&&e++;}return e*o.N3},e.getPenaltyN4=function(t){for(var r=0,e=t.data.length,n=0;n<e;n++)r+=t.data[n];return Math.abs(Math.ceil(100*r/e/5)-10)*o.N4},e.applyMask=function(t,r){for(var e=r.size,o=0;o<e;o++)for(var i=0;i<e;i++)r.isReserved(i,o)||r.xor(i,o,n(t,i,o));},e.getBestMask=function(t,r){for(var n=Object.keys(e.Patterns).length,o=0,i=1/0,u=0;u<n;u++){r(u),e.applyMask(u,t);var a=e.getPenaltyN1(t)+e.getPenaltyN2(t)+e.getPenaltyN3(t)+e.getPenaltyN4(t);e.applyMask(u,t),a<i&&(i=a,o=u);}return o};},{}],14:[function(t,r,e){function n(t){if("string"!=typeof t)throw new Error("Param is not a string");switch(t.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+t)}}var o=t("./version-check"),i=t("./regex");e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(t,r){if(!t.ccBits)throw new Error("Invalid mode: "+t);if(!o.isValid(r))throw new Error("Invalid version: "+r);return r>=1&&r<10?t.ccBits[0]:r<27?t.ccBits[1]:t.ccBits[2]},e.getBestModeForData=function(t){return i.testNumeric(t)?e.NUMERIC:i.testAlphanumeric(t)?e.ALPHANUMERIC:i.testKanji(t)?e.KANJI:e.BYTE},e.toString=function(t){if(t&&t.id)return t.id;throw new Error("Invalid mode")},e.isValid=function(t){return t&&t.bit&&t.ccBits},e.from=function(t,r){if(e.isValid(t))return t;try{return n(t)}catch(t){return r}};},{"./regex":19,"./version-check":22}],15:[function(t,r,e){function n(t){this.mode=o.NUMERIC,this.data=t.toString();}var o=t("./mode");n.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r,e,n;for(r=0;r+3<=this.data.length;r+=3)e=this.data.substr(r,3),n=parseInt(e,10),t.put(n,10);var o=this.data.length-r;o>0&&(e=this.data.substr(r),n=parseInt(e,10),t.put(n,3*o+1));},r.exports=n;},{"./mode":14}],16:[function(t,r,e){var n=t("../utils/buffer"),o=t("./galois-field");e.mul=function(t,r){for(var e=n.alloc(t.length+r.length-1),i=0;i<t.length;i++)for(var u=0;u<r.length;u++)e[i+u]^=o.mul(t[i],r[u]);return e},e.mod=function(t,r){for(var e=n.from(t);e.length-r.length>=0;){for(var i=e[0],u=0;u<r.length;u++)e[u]^=o.mul(r[u],i);for(var a=0;a<e.length&&0===e[a];)a++;e=e.slice(a);}return e},e.generateECPolynomial=function(t){for(var r=n.from([1]),i=0;i<t;i++)r=e.mul(r,[1,o.exp(i)]);return r};},{"../utils/buffer":28,"./galois-field":11}],17:[function(t,r,e){function n(t,r){for(var e=t.size,n=w.getPositions(r),o=0;o<n.length;o++)for(var i=n[o][0],u=n[o][1],a=-1;a<=7;a++)if(!(i+a<=-1||e<=i+a))for(var f=-1;f<=7;f++)u+f<=-1||e<=u+f||(a>=0&&a<=6&&(0===f||6===f)||f>=0&&f<=6&&(0===a||6===a)||a>=2&&a<=4&&f>=2&&f<=4?t.set(i+a,u+f,!0,!0):t.set(i+a,u+f,!1,!0));}function o(t){for(var r=t.size,e=8;e<r-8;e++){var n=e%2==0;t.set(e,6,n,!0),t.set(6,e,n,!0);}}function i(t,r){for(var e=v.getPositions(r),n=0;n<e.length;n++)for(var o=e[n][0],i=e[n][1],u=-2;u<=2;u++)for(var a=-2;a<=2;a++)-2===u||2===u||-2===a||2===a||0===u&&0===a?t.set(o+u,i+a,!0,!0):t.set(o+u,i+a,!1,!0);}function u(t,r){for(var e,n,o,i=t.size,u=A.getEncodedBits(r),a=0;a<18;a++)e=Math.floor(a/3),n=a%3+i-8-3,o=1==(u>>a&1),t.set(e,n,o,!0),t.set(n,e,o,!0);}function a(t,r,e){var n,o,i=t.size,u=B.getEncodedBits(r,e);for(n=0;n<15;n++)o=1==(u>>n&1),n<6?t.set(n,8,o,!0):n<8?t.set(n+1,8,o,!0):t.set(i-15+n,8,o,!0),n<8?t.set(8,i-n-1,o,!0):n<9?t.set(8,15-n-1+1,o,!0):t.set(8,15-n-1,o,!0);t.set(i-8,8,1,!0);}function f(t,r){for(var e=t.size,n=-1,o=e-1,i=7,u=0,a=e-1;a>0;a-=2)for(6===a&&a--;;){for(var f=0;f<2;f++)if(!t.isReserved(o,a-f)){var s=!1;u<r.length&&(s=1==(r[u]>>>i&1)),t.set(o,a-f,s),i--,-1===i&&(u++,i=7);}if((o+=n)<0||e<=o){o-=n,n=-n;break}}}function s(t,r,e){var n=new d;e.forEach(function(r){n.put(r.mode.bit,4),n.put(r.getLength(),T.getCharCountIndicator(r.mode,t)),r.write(n);});var o=g.getSymbolTotalCodewords(t),i=b.getTotalCodewordsCount(t,r),u=8*(o-i);for(n.getLengthInBits()+4<=u&&n.put(0,4);n.getLengthInBits()%8!=0;)n.putBit(0);for(var a=(u-n.getLengthInBits())/8,f=0;f<a;f++)n.put(f%2?17:236,8);return h(n,t,r)}function h(t,r,e){for(var n=g.getSymbolTotalCodewords(r),o=b.getTotalCodewordsCount(r,e),i=n-o,u=b.getBlocksCount(r,e),a=n%u,f=u-a,s=Math.floor(n/u),h=Math.floor(i/u),c=h+1,p=s-h,d=new E(p),y=0,v=new Array(u),w=new Array(u),m=0,A=l.from(t.buffer),B=0;B<u;B++){var T=B<f?h:c;v[B]=A.slice(y,y+T),w[B]=d.encode(v[B]),y+=T,m=Math.max(m,T);}var R,C,P=l.alloc(n),I=0;for(R=0;R<m;R++)for(C=0;C<u;C++)R<v[C].length&&(P[I++]=v[C][R]);for(R=0;R<p;R++)for(C=0;C<u;C++)P[I++]=w[C][R];return P}function c(t,r,e,h){var c;if(C(t))c=R.fromArray(t);else{if("string"!=typeof t)throw new Error("Invalid data");var l=r;if(!l){var p=R.rawSplit(t);l=A.getBestVersionForData(p,e);}c=R.fromString(t,l||40);}var d=A.getBestVersionForData(c,e);if(!d)throw new Error("The amount of data is too big to be stored in a QR Code");if(r){if(r<d)throw new Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+d+".\n")}else r=d;var v=s(r,e,c),w=g.getSymbolSize(r),b=new y(w);return n(b,r),o(b),i(b,r),a(b,e,0),r>=7&&u(b,r),f(b,v),isNaN(h)&&(h=m.getBestMask(b,a.bind(null,b,e))),m.applyMask(h,b),a(b,e,h),{modules:b,version:r,errorCorrectionLevel:e,maskPattern:h,segments:c}}var l=t("../utils/buffer"),g=t("./utils"),p=t("./error-correction-level"),d=t("./bit-buffer"),y=t("./bit-matrix"),v=t("./alignment-pattern"),w=t("./finder-pattern"),m=t("./mask-pattern"),b=t("./error-correction-code"),E=t("./reed-solomon-encoder"),A=t("./version"),B=t("./format-info"),T=t("./mode"),R=t("./segments"),C=t("isarray");e.create=function(t,r){if(void 0===t||""===t)throw new Error("No input text");var e,n,o=p.M;return void 0!==r&&(o=p.from(r.errorCorrectionLevel,p.M),e=A.from(r.version),n=m.from(r.maskPattern),r.toSJISFunc&&g.setToSJISFunction(r.toSJISFunc)),c(t,e,o,n)};},{"../utils/buffer":28,"./alignment-pattern":2,"./bit-buffer":4,"./bit-matrix":5,"./error-correction-code":7,"./error-correction-level":8,"./finder-pattern":9,"./format-info":10,"./mask-pattern":13,"./mode":14,"./reed-solomon-encoder":18,"./segments":20,"./utils":21,"./version":23,isarray:33}],18:[function(t,r,e){function n(t){this.genPoly=void 0,this.degree=t,this.degree&&this.initialize(this.degree);}var o=t("../utils/buffer"),i=t("./polynomial"),u=t("buffer").Buffer;n.prototype.initialize=function(t){this.degree=t,this.genPoly=i.generateECPolynomial(this.degree);},n.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");var r=o.alloc(this.degree),e=u.concat([t,r],t.length+this.degree),n=i.mod(e,this.genPoly),a=this.degree-n.length;if(a>0){var f=o.alloc(this.degree);return n.copy(f,a),f}return n},r.exports=n;},{"../utils/buffer":28,"./polynomial":16,buffer:30}],19:[function(t,r,e){var n="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";n=n.replace(/u/g,"\\u");var o="(?:(?![A-Z0-9 $%*+\\-./:]|"+n+")(?:.|[\r\n]))+";e.KANJI=new RegExp(n,"g"),e.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),e.BYTE=new RegExp(o,"g"),e.NUMERIC=new RegExp("[0-9]+","g"),e.ALPHANUMERIC=new RegExp("[A-Z $%*+\\-./:]+","g");var i=new RegExp("^"+n+"$"),u=new RegExp("^[0-9]+$"),a=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");e.testKanji=function(t){return i.test(t)},e.testNumeric=function(t){return u.test(t)},e.testAlphanumeric=function(t){return a.test(t)};},{}],20:[function(t,r,e){function n(t){return unescape(encodeURIComponent(t)).length}function o(t,r,e){for(var n,o=[];null!==(n=t.exec(e));)o.push({data:n[0],index:n.index,mode:r,length:n[0].length});return o}function i(t){var r,e,n=o(y.NUMERIC,c.NUMERIC,t),i=o(y.ALPHANUMERIC,c.ALPHANUMERIC,t);return v.isKanjiModeEnabled()?(r=o(y.BYTE,c.BYTE,t),e=o(y.KANJI,c.KANJI,t)):(r=o(y.BYTE_KANJI,c.BYTE,t),e=[]),n.concat(i,r,e).sort(function(t,r){return t.index-r.index}).map(function(t){return {data:t.data,mode:t.mode,length:t.length}})}function u(t,r){switch(r){case c.NUMERIC:return l.getBitsLength(t);case c.ALPHANUMERIC:return g.getBitsLength(t);case c.KANJI:return d.getBitsLength(t);case c.BYTE:return p.getBitsLength(t)}}function a(t){return t.reduce(function(t,r){var e=t.length-1>=0?t[t.length-1]:null;return e&&e.mode===r.mode?(t[t.length-1].data+=r.data,t):(t.push(r),t)},[])}function f(t){for(var r=[],e=0;e<t.length;e++){var o=t[e];switch(o.mode){case c.NUMERIC:r.push([o,{data:o.data,mode:c.ALPHANUMERIC,length:o.length},{data:o.data,mode:c.BYTE,length:o.length}]);break;case c.ALPHANUMERIC:r.push([o,{data:o.data,mode:c.BYTE,length:o.length}]);break;case c.KANJI:r.push([o,{data:o.data,mode:c.BYTE,length:n(o.data)}]);break;case c.BYTE:r.push([{data:o.data,mode:c.BYTE,length:n(o.data)}]);}}return r}function s(t,r){for(var e={},n={start:{}},o=["start"],i=0;i<t.length;i++){for(var a=t[i],f=[],s=0;s<a.length;s++){var h=a[s],l=""+i+s;f.push(l),e[l]={node:h,lastCount:0},n[l]={};for(var g=0;g<o.length;g++){var p=o[g];e[p]&&e[p].node.mode===h.mode?(n[p][l]=u(e[p].lastCount+h.length,h.mode)-u(e[p].lastCount,h.mode),e[p].lastCount+=h.length):(e[p]&&(e[p].lastCount=h.length),n[p][l]=u(h.length,h.mode)+4+c.getCharCountIndicator(h.mode,r));}}o=f;}for(g=0;g<o.length;g++)n[o[g]].end=0;return {map:n,table:e}}function h(t,r){var e,n=c.getBestModeForData(t);if((e=c.from(r,n))!==c.BYTE&&e.bit<n.bit)throw new Error('"'+t+'" cannot be encoded with mode '+c.toString(e)+".\n Suggested mode is: "+c.toString(n));switch(e!==c.KANJI||v.isKanjiModeEnabled()||(e=c.BYTE),e){case c.NUMERIC:return new l(t);case c.ALPHANUMERIC:return new g(t);case c.KANJI:return new d(t);case c.BYTE:return new p(t)}}var c=t("./mode"),l=t("./numeric-data"),g=t("./alphanumeric-data"),p=t("./byte-data"),d=t("./kanji-data"),y=t("./regex"),v=t("./utils"),w=t("dijkstrajs");e.fromArray=function(t){return t.reduce(function(t,r){return "string"==typeof r?t.push(h(r,null)):r.data&&t.push(h(r.data,r.mode)),t},[])},e.fromString=function(t,r){for(var n=i(t,v.isKanjiModeEnabled()),o=f(n),u=s(o,r),h=w.find_path(u.map,"start","end"),c=[],l=1;l<h.length-1;l++)c.push(u.table[h[l]].node);return e.fromArray(a(c))},e.rawSplit=function(t){return e.fromArray(i(t,v.isKanjiModeEnabled()))};},{"./alphanumeric-data":3,"./byte-data":6,"./kanji-data":12,"./mode":14,"./numeric-data":15,"./regex":19,"./utils":21,dijkstrajs:31}],21:[function(t,r,e){var n,o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];e.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return 4*t+17},e.getSymbolTotalCodewords=function(t){return o[t]},e.getBCHDigit=function(t){for(var r=0;0!==t;)r++,t>>>=1;return r},e.setToSJISFunction=function(t){if("function"!=typeof t)throw new Error('"toSJISFunc" is not a valid function.');n=t;},e.isKanjiModeEnabled=function(){return void 0!==n},e.toSJIS=function(t){return n(t)};},{}],22:[function(t,r,e){e.isValid=function(t){return !isNaN(t)&&t>=1&&t<=40};},{}],23:[function(t,r,e){function n(t,r,n){for(var o=1;o<=40;o++)if(r<=e.getCapacity(o,n,t))return o}function o(t,r){return h.getCharCountIndicator(t,r)+4}function i(t,r){var e=0;return t.forEach(function(t){var n=o(t.mode,r);e+=n+t.getBitsLength();}),e}function u(t,r){for(var n=1;n<=40;n++){if(i(t,n)<=e.getCapacity(n,r,h.MIXED))return n}}var a=t("./utils"),f=t("./error-correction-code"),s=t("./error-correction-level"),h=t("./mode"),c=t("./version-check"),l=t("isarray"),g=a.getBCHDigit(7973);e.from=function(t,r){return c.isValid(t)?parseInt(t,10):r},e.getCapacity=function(t,r,e){if(!c.isValid(t))throw new Error("Invalid QR Code version");void 0===e&&(e=h.BYTE);var n=a.getSymbolTotalCodewords(t),i=f.getTotalCodewordsCount(t,r),u=8*(n-i);if(e===h.MIXED)return u;var s=u-o(e,t);switch(e){case h.NUMERIC:return Math.floor(s/10*3);case h.ALPHANUMERIC:return Math.floor(s/11*2);case h.KANJI:return Math.floor(s/13);case h.BYTE:default:return Math.floor(s/8)}},e.getBestVersionForData=function(t,r){var e,o=s.from(r,s.M);if(l(t)){if(t.length>1)return u(t,o);if(0===t.length)return 1;e=t[0];}else e=t;return n(e.mode,e.getLength(),o)},e.getEncodedBits=function(t){if(!c.isValid(t)||t<7)throw new Error("Invalid QR Code version");for(var r=t<<12;a.getBCHDigit(r)-g>=0;)r^=7973<<a.getBCHDigit(r)-g;return t<<12|r};},{"./error-correction-code":7,"./error-correction-level":8,"./mode":14,"./utils":21,"./version-check":22,isarray:33}],24:[function(t,r,e){function n(t,r,e,n,u){var a=[].slice.call(arguments,1),f=a.length,s="function"==typeof a[f-1];if(!s&&!o())throw new Error("Callback required as last argument");if(!s){if(f<1)throw new Error("Too few arguments provided");return 1===f?(e=r,r=n=void 0):2!==f||r.getContext||(n=e,e=r,r=void 0),new Promise(function(o,u){try{var a=i.create(e,n);o(t(a,r,n));}catch(t){u(t);}})}if(f<2)throw new Error("Too few arguments provided");2===f?(u=e,e=r,r=n=void 0):3===f&&(r.getContext&&void 0===u?(u=n,n=void 0):(u=n,n=e,e=r,r=void 0));try{var h=i.create(e,n);u(null,t(h,r,n));}catch(t){u(t);}}var o=t("./can-promise"),i=t("./core/qrcode"),u=t("./renderer/canvas"),a=t("./renderer/svg-tag.js");e.create=i.create,e.toCanvas=n.bind(null,u.render),e.toDataURL=n.bind(null,u.renderToDataURL),e.toString=n.bind(null,function(t,r,e){return a.render(t,e)});},{"./can-promise":1,"./core/qrcode":17,"./renderer/canvas":25,"./renderer/svg-tag.js":26}],25:[function(t,r,e){function n(t,r,e){t.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=e,r.width=e,r.style.height=e+"px",r.style.width=e+"px";}function o(){try{return document.createElement("canvas")}catch(t){throw new Error("You need to specify a canvas element")}}var i=t("./utils");e.render=function(t,r,e){var u=e,a=r;void 0!==u||r&&r.getContext||(u=r,r=void 0),r||(a=o()),u=i.getOptions(u);var f=i.getImageWidth(t.modules.size,u),s=a.getContext("2d"),h=s.createImageData(f,f);return i.qrToImageData(h.data,t,u),n(s,a,f),s.putImageData(h,0,0),a},e.renderToDataURL=function(t,r,n){var o=n;void 0!==o||r&&r.getContext||(o=r,r=void 0),o||(o={});var i=e.render(t,r,o),u=o.type||"image/png",a=o.rendererOpts||{};return i.toDataURL(u,a.quality)};},{"./utils":27}],26:[function(t,r,e){function n(t,r){var e=t.a/255,n=r+'="'+t.hex+'"';return e<1?n+" "+r+'-opacity="'+e.toFixed(2).slice(1)+'"':n}function o(t,r,e){var n=t+r;return void 0!==e&&(n+=" "+e),n}function i(t,r,e){for(var n="",i=0,u=!1,a=0,f=0;f<t.length;f++){var s=Math.floor(f%r),h=Math.floor(f/r);s||u||(u=!0),t[f]?(a++,f>0&&s>0&&t[f-1]||(n+=u?o("M",s+e,.5+h+e):o("m",i,0),i=0,u=!1),s+1<r&&t[f+1]||(n+=o("h",a),a=0)):i++;}return n}var u=t("./utils");e.render=function(t,r,e){var o=u.getOptions(r),a=t.modules.size,f=t.modules.data,s=a+2*o.margin,h=o.color.light.a?"<path "+n(o.color.light,"fill")+' d="M0 0h'+s+"v"+s+'H0z"/>':"",c="<path "+n(o.color.dark,"stroke")+' d="'+i(f,a,o.margin)+'"/>',l='viewBox="0 0 '+s+" "+s+'"',g=o.width?'width="'+o.width+'" height="'+o.width+'" ':"",p='<svg xmlns="http://www.w3.org/2000/svg" '+g+l+' shape-rendering="crispEdges">'+h+c+"</svg>\n";return "function"==typeof e&&e(null,p),p};},{"./utils":27}],27:[function(t,r,e){function n(t){if("number"==typeof t&&(t=t.toString()),"string"!=typeof t)throw new Error("Color should be defined as hex string");var r=t.slice().replace("#","").split("");if(r.length<3||5===r.length||r.length>8)throw new Error("Invalid hex color: "+t);3!==r.length&&4!==r.length||(r=Array.prototype.concat.apply([],r.map(function(t){return [t,t]}))),6===r.length&&r.push("F","F");var e=parseInt(r.join(""),16);return {r:e>>24&255,g:e>>16&255,b:e>>8&255,a:255&e,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(t){t||(t={}),t.color||(t.color={});var r=void 0===t.margin||null===t.margin||t.margin<0?4:t.margin,e=t.width&&t.width>=21?t.width:void 0,o=t.scale||4;return {width:e,scale:e?4:o,margin:r,color:{dark:n(t.color.dark||"#000000ff"),light:n(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}},e.getScale=function(t,r){return r.width&&r.width>=t+2*r.margin?r.width/(t+2*r.margin):r.scale},e.getImageWidth=function(t,r){var n=e.getScale(t,r);return Math.floor((t+2*r.margin)*n)},e.qrToImageData=function(t,r,n){for(var o=r.modules.size,i=r.modules.data,u=e.getScale(o,n),a=Math.floor((o+2*n.margin)*u),f=n.margin*u,s=[n.color.light,n.color.dark],h=0;h<a;h++)for(var c=0;c<a;c++){var l=4*(h*a+c),g=n.color.light;if(h>=f&&c>=f&&h<a-f&&c<a-f){var p=Math.floor((h-f)/u),d=Math.floor((c-f)/u);g=s[i[p*o+d]?1:0];}t[l++]=g.r,t[l++]=g.g,t[l++]=g.b,t[l]=g.a;}};},{}],28:[function(t,r,e){function n(t,r,e){return n.TYPED_ARRAY_SUPPORT||this instanceof n?"number"==typeof t?a(this,t):y(this,t,r,e):new n(t,r,e)}function o(t){if(t>=w)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+w.toString(16)+" bytes");return 0|t}function i(t){return t!==t}function u(t,r){var e;return n.TYPED_ARRAY_SUPPORT?(e=new Uint8Array(r),e.__proto__=n.prototype):(e=t,null===e&&(e=new n(r)),e.length=r),e}function a(t,r){var e=u(t,r<0?0:0|o(r));if(!n.TYPED_ARRAY_SUPPORT)for(var i=0;i<r;++i)e[i]=0;return e}function f(t,r){var e=0|g(r),n=u(t,e),o=n.write(r);return o!==e&&(n=n.slice(0,o)),n}function s(t,r){for(var e=r.length<0?0:0|o(r.length),n=u(t,e),i=0;i<e;i+=1)n[i]=255&r[i];return n}function h(t,r,e,o){if(e<0||r.byteLength<e)throw new RangeError("'offset' is out of bounds");if(r.byteLength<e+(o||0))throw new RangeError("'length' is out of bounds");var i;return i=void 0===e&&void 0===o?new Uint8Array(r):void 0===o?new Uint8Array(r,e):new Uint8Array(r,e,o),n.TYPED_ARRAY_SUPPORT?i.__proto__=n.prototype:i=s(t,i),i}function c(t,r){if(n.isBuffer(r)){var e=0|o(r.length),a=u(t,e);return 0===a.length?a:(r.copy(a,0,0,e),a)}if(r){if("undefined"!=typeof ArrayBuffer&&r.buffer instanceof ArrayBuffer||"length"in r)return "number"!=typeof r.length||i(r.length)?u(t,0):s(t,r);if("Buffer"===r.type&&Array.isArray(r.data))return s(t,r.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}function l(t,r){r=r||1/0;for(var e,n=t.length,o=null,i=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!o){if(e>56319){(r-=3)>-1&&i.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&i.push(239,191,189);continue}o=e;continue}if(e<56320){(r-=3)>-1&&i.push(239,191,189),o=e;continue}e=65536+(o-55296<<10|e-56320);}else o&&(r-=3)>-1&&i.push(239,191,189);if(o=null,e<128){if((r-=1)<0)break;i.push(e);}else if(e<2048){if((r-=2)<0)break;i.push(e>>6|192,63&e|128);}else if(e<65536){if((r-=3)<0)break;i.push(e>>12|224,e>>6&63|128,63&e|128);}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;i.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128);}}return i}function g(t){return n.isBuffer(t)?t.length:"undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer)?t.byteLength:("string"!=typeof t&&(t=""+t),0===t.length?0:l(t).length)}function p(t,r,e,n){for(var o=0;o<n&&!(o+e>=r.length||o>=t.length);++o)r[o+e]=t[o];return o}function d(t,r,e,n){return p(l(r,t.length-e),t,e,n)}function y(t,r,e,n){if("number"==typeof r)throw new TypeError('"value" argument must not be a number');return "undefined"!=typeof ArrayBuffer&&r instanceof ArrayBuffer?h(t,r,e,n):"string"==typeof r?f(t,r):c(t,r)}var v=t("isarray");n.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()}catch(t){return !1}}();var w=n.TYPED_ARRAY_SUPPORT?2147483647:1073741823;n.TYPED_ARRAY_SUPPORT&&(n.prototype.__proto__=Uint8Array.prototype,n.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&n[Symbol.species]===n&&Object.defineProperty(n,Symbol.species,{value:null,configurable:!0,enumerable:!1,writable:!1})),n.prototype.write=function(t,r,e){void 0===r?(e=this.length,r=0):void 0===e&&"string"==typeof r?(e=this.length,r=0):isFinite(r)&&(r|=0,isFinite(e)?e|=0:e=void 0);var n=this.length-r;if((void 0===e||e>n)&&(e=n),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");return d(this,t,r,e)},n.prototype.slice=function(t,r){var e=this.length;t=~~t,r=void 0===r?e:~~r,t<0?(t+=e)<0&&(t=0):t>e&&(t=e),r<0?(r+=e)<0&&(r=0):r>e&&(r=e),r<t&&(r=t);var o;if(n.TYPED_ARRAY_SUPPORT)o=this.subarray(t,r),o.__proto__=n.prototype;else{var i=r-t;o=new n(i,void 0);for(var u=0;u<i;++u)o[u]=this[u+t];}return o},n.prototype.copy=function(t,r,e,o){if(e||(e=0),o||0===o||(o=this.length),r>=t.length&&(r=t.length),r||(r=0),o>0&&o<e&&(o=e),o===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("sourceStart out of bounds");if(o<0)throw new RangeError("sourceEnd out of bounds");o>this.length&&(o=this.length),t.length-r<o-e&&(o=t.length-r+e);var i,u=o-e;if(this===t&&e<r&&r<o)for(i=u-1;i>=0;--i)t[i+r]=this[i+e];else if(u<1e3||!n.TYPED_ARRAY_SUPPORT)for(i=0;i<u;++i)t[i+r]=this[i+e];else Uint8Array.prototype.set.call(t,this.subarray(e,e+u),r);return u},n.prototype.fill=function(t,r,e){if("string"==typeof t){if("string"==typeof r?(r=0,e=this.length):"string"==typeof e&&(e=this.length),1===t.length){var o=t.charCodeAt(0);o<256&&(t=o);}}else"number"==typeof t&&(t&=255);if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0);var i;if("number"==typeof t)for(i=r;i<e;++i)this[i]=t;else{var u=n.isBuffer(t)?t:new n(t),a=u.length;for(i=0;i<e-r;++i)this[i+r]=u[i%a];}return this},n.concat=function(t,r){if(!v(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u(null,0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var o=a(null,r),i=0;for(e=0;e<t.length;++e){var f=t[e];if(!n.isBuffer(f))throw new TypeError('"list" argument must be an Array of Buffers');f.copy(o,i),i+=f.length;}return o},n.byteLength=g,n.prototype._isBuffer=!0,n.isBuffer=function(t){return !(null==t||!t._isBuffer)},r.exports.alloc=function(t){var r=new n(t);return r.fill(0),r},r.exports.from=function(t){return new n(t)};},{isarray:33}],29:[function(t,r,e){function n(t){var r=t.length;if(r%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var e=t.indexOf("=");return -1===e&&(e=r),[e,e===r?0:4-e%4]}function o(t){var r=n(t),e=r[0],o=r[1];return 3*(e+o)/4-o}function i(t,r,e){return 3*(r+e)/4-e}function u(t){var r,e,o=n(t),u=o[0],a=o[1],f=new l(i(t,u,a)),s=0,h=a>0?u-4:u;for(e=0;e<h;e+=4)r=c[t.charCodeAt(e)]<<18|c[t.charCodeAt(e+1)]<<12|c[t.charCodeAt(e+2)]<<6|c[t.charCodeAt(e+3)],f[s++]=r>>16&255,f[s++]=r>>8&255,f[s++]=255&r;return 2===a&&(r=c[t.charCodeAt(e)]<<2|c[t.charCodeAt(e+1)]>>4,f[s++]=255&r),1===a&&(r=c[t.charCodeAt(e)]<<10|c[t.charCodeAt(e+1)]<<4|c[t.charCodeAt(e+2)]>>2,f[s++]=r>>8&255,f[s++]=255&r),f}function a(t){return h[t>>18&63]+h[t>>12&63]+h[t>>6&63]+h[63&t]}function f(t,r,e){for(var n,o=[],i=r;i<e;i+=3)n=(t[i]<<16&16711680)+(t[i+1]<<8&65280)+(255&t[i+2]),o.push(a(n));return o.join("")}function s(t){for(var r,e=t.length,n=e%3,o=[],i=0,u=e-n;i<u;i+=16383)o.push(f(t,i,i+16383>u?u:i+16383));return 1===n?(r=t[e-1],o.push(h[r>>2]+h[r<<4&63]+"==")):2===n&&(r=(t[e-2]<<8)+t[e-1],o.push(h[r>>10]+h[r>>4&63]+h[r<<2&63]+"=")),o.join("")}e.byteLength=o,e.toByteArray=u,e.fromByteArray=s
;for(var h=[],c=[],l="undefined"!=typeof Uint8Array?Uint8Array:Array,g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",p=0,d=g.length;p<d;++p)h[p]=g[p],c[g.charCodeAt(p)]=p;c["-".charCodeAt(0)]=62,c["_".charCodeAt(0)]=63;},{}],30:[function(t,r,e){function n(t){if(t>$)throw new RangeError('The value "'+t+'" is invalid for option "size"');var r=new Uint8Array(t);return Object.setPrototypeOf(r,o.prototype),r}function o(t,r,e){if("number"==typeof t){if("string"==typeof r)throw new TypeError('The "string" argument must be of type string. Received type number');return f(t)}return i(t,r,e)}function i(t,r,e){if("string"==typeof t)return s(t,r);if(ArrayBuffer.isView(t))return h(t);if(null==t)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t);if(J(t,ArrayBuffer)||t&&J(t.buffer,ArrayBuffer))return c(t,r,e);if("number"==typeof t)throw new TypeError('The "value" argument must not be of type number. Received type number');var n=t.valueOf&&t.valueOf();if(null!=n&&n!==t)return o.from(n,r,e);var i=l(t);if(i)return i;if("undefined"!=typeof Symbol&&null!=Symbol.toPrimitive&&"function"==typeof t[Symbol.toPrimitive])return o.from(t[Symbol.toPrimitive]("string"),r,e);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t)}function u(t){if("number"!=typeof t)throw new TypeError('"size" argument must be of type number');if(t<0)throw new RangeError('The value "'+t+'" is invalid for option "size"')}function a(t,r,e){return u(t),t<=0?n(t):void 0!==r?"string"==typeof e?n(t).fill(r,e):n(t).fill(r):n(t)}function f(t){return u(t),n(t<0?0:0|g(t))}function s(t,r){if("string"==typeof r&&""!==r||(r="utf8"),!o.isEncoding(r))throw new TypeError("Unknown encoding: "+r);var e=0|d(t,r),i=n(e),u=i.write(t,r);return u!==e&&(i=i.slice(0,u)),i}function h(t){for(var r=t.length<0?0:0|g(t.length),e=n(r),o=0;o<r;o+=1)e[o]=255&t[o];return e}function c(t,r,e){if(r<0||t.byteLength<r)throw new RangeError('"offset" is outside of buffer bounds');if(t.byteLength<r+(e||0))throw new RangeError('"length" is outside of buffer bounds');var n;return n=void 0===r&&void 0===e?new Uint8Array(t):void 0===e?new Uint8Array(t,r):new Uint8Array(t,r,e),Object.setPrototypeOf(n,o.prototype),n}function l(t){if(o.isBuffer(t)){var r=0|g(t.length),e=n(r);return 0===e.length?e:(t.copy(e,0,0,r),e)}return void 0!==t.length?"number"!=typeof t.length||K(t.length)?n(0):h(t):"Buffer"===t.type&&Array.isArray(t.data)?h(t.data):void 0}function g(t){if(t>=$)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+$.toString(16)+" bytes");return 0|t}function p(t){return +t!=t&&(t=0),o.alloc(+t)}function d(t,r){if(o.isBuffer(t))return t.length;if(ArrayBuffer.isView(t)||J(t,ArrayBuffer))return t.byteLength;if("string"!=typeof t)throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof t);var e=t.length,n=arguments.length>2&&!0===arguments[2];if(!n&&0===e)return 0;for(var i=!1;;)switch(r){case"ascii":case"latin1":case"binary":return e;case"utf8":case"utf-8":return D(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*e;case"hex":return e>>>1;case"base64":return z(t).length;default:if(i)return n?-1:D(t).length;r=(""+r).toLowerCase(),i=!0;}}function y(t,r,e){var n=!1;if((void 0===r||r<0)&&(r=0),r>this.length)return "";if((void 0===e||e>this.length)&&(e=this.length),e<=0)return "";if(e>>>=0,r>>>=0,e<=r)return "";for(t||(t="utf8");;)switch(t){case"hex":return N(this,r,e);case"utf8":case"utf-8":return P(this,r,e);case"ascii":return M(this,r,e);case"latin1":case"binary":return U(this,r,e);case"base64":return C(this,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return S(this,r,e);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0;}}function v(t,r,e){var n=t[r];t[r]=t[e],t[e]=n;}function w(t,r,e,n,i){if(0===t.length)return -1;if("string"==typeof e?(n=e,e=0):e>2147483647?e=2147483647:e<-2147483648&&(e=-2147483648),e=+e,K(e)&&(e=i?0:t.length-1),e<0&&(e=t.length+e),e>=t.length){if(i)return -1;e=t.length-1;}else if(e<0){if(!i)return -1;e=0;}if("string"==typeof r&&(r=o.from(r,n)),o.isBuffer(r))return 0===r.length?-1:m(t,r,e,n,i);if("number"==typeof r)return r&=255,"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,r,e):Uint8Array.prototype.lastIndexOf.call(t,r,e):m(t,[r],e,n,i);throw new TypeError("val must be string, number or Buffer")}function m(t,r,e,n,o){function i(t,r){return 1===u?t[r]:t.readUInt16BE(r*u)}var u=1,a=t.length,f=r.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||r.length<2)return -1;u=2,a/=2,f/=2,e/=2;}var s;if(o){var h=-1;for(s=e;s<a;s++)if(i(t,s)===i(r,-1===h?0:s-h)){if(-1===h&&(h=s),s-h+1===f)return h*u}else-1!==h&&(s-=s-h),h=-1;}else for(e+f>a&&(e=a-f),s=e;s>=0;s--){for(var c=!0,l=0;l<f;l++)if(i(t,s+l)!==i(r,l)){c=!1;break}if(c)return s}return -1}function b(t,r,e,n){e=Number(e)||0;var o=t.length-e;n?(n=Number(n))>o&&(n=o):n=o;var i=r.length;n>i/2&&(n=i/2);for(var u=0;u<n;++u){var a=parseInt(r.substr(2*u,2),16);if(K(a))return u;t[e+u]=a;}return u}function E(t,r,e,n){return H(D(r,t.length-e),t,e,n)}function A(t,r,e,n){return H(j(r),t,e,n)}function B(t,r,e,n){return A(t,r,e,n)}function T(t,r,e,n){return H(z(r),t,e,n)}function R(t,r,e,n){return H(F(r,t.length-e),t,e,n)}function C(t,r,e){return 0===r&&e===t.length?q.fromByteArray(t):q.fromByteArray(t.slice(r,e))}function P(t,r,e){e=Math.min(t.length,e);for(var n=[],o=r;o<e;){var i=t[o],u=null,a=i>239?4:i>223?3:i>191?2:1;if(o+a<=e){var f,s,h,c;switch(a){case 1:i<128&&(u=i);break;case 2:f=t[o+1],128==(192&f)&&(c=(31&i)<<6|63&f)>127&&(u=c);break;case 3:f=t[o+1],s=t[o+2],128==(192&f)&&128==(192&s)&&(c=(15&i)<<12|(63&f)<<6|63&s)>2047&&(c<55296||c>57343)&&(u=c);break;case 4:f=t[o+1],s=t[o+2],h=t[o+3],128==(192&f)&&128==(192&s)&&128==(192&h)&&(c=(15&i)<<18|(63&f)<<12|(63&s)<<6|63&h)>65535&&c<1114112&&(u=c);}}null===u?(u=65533,a=1):u>65535&&(u-=65536,n.push(u>>>10&1023|55296),u=56320|1023&u),n.push(u),o+=a;}return I(n)}function I(t){var r=t.length;if(r<=X)return String.fromCharCode.apply(String,t);for(var e="",n=0;n<r;)e+=String.fromCharCode.apply(String,t.slice(n,n+=X));return e}function M(t,r,e){var n="";e=Math.min(t.length,e);for(var o=r;o<e;++o)n+=String.fromCharCode(127&t[o]);return n}function U(t,r,e){var n="";e=Math.min(t.length,e);for(var o=r;o<e;++o)n+=String.fromCharCode(t[o]);return n}function N(t,r,e){var n=t.length;(!r||r<0)&&(r=0),(!e||e<0||e>n)&&(e=n);for(var o="",i=r;i<e;++i)o+=W[t[i]];return o}function S(t,r,e){for(var n=t.slice(r,e),o="",i=0;i<n.length;i+=2)o+=String.fromCharCode(n[i]+256*n[i+1]);return o}function L(t,r,e){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+r>e)throw new RangeError("Trying to access beyond buffer length")}function x(t,r,e,n,i,u){if(!o.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(r>i||r<u)throw new RangeError('"value" argument is out of bounds');if(e+n>t.length)throw new RangeError("Index out of range")}function _(t,r,e,n,o,i){if(e+n>t.length)throw new RangeError("Index out of range");if(e<0)throw new RangeError("Index out of range")}function k(t,r,e,n,o){return r=+r,e>>>=0,o||_(t,r,e,4),V.write(t,r,e,n,23,4),e+4}function O(t,r,e,n,o){return r=+r,e>>>=0,o||_(t,r,e,8),V.write(t,r,e,n,52,8),e+8}function Y(t){if(t=t.split("=")[0],t=t.trim().replace(Z,""),t.length<2)return "";for(;t.length%4!=0;)t+="=";return t}function D(t,r){r=r||1/0;for(var e,n=t.length,o=null,i=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!o){if(e>56319){(r-=3)>-1&&i.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&i.push(239,191,189);continue}o=e;continue}if(e<56320){(r-=3)>-1&&i.push(239,191,189),o=e;continue}e=65536+(o-55296<<10|e-56320);}else o&&(r-=3)>-1&&i.push(239,191,189);if(o=null,e<128){if((r-=1)<0)break;i.push(e);}else if(e<2048){if((r-=2)<0)break;i.push(e>>6|192,63&e|128);}else if(e<65536){if((r-=3)<0)break;i.push(e>>12|224,e>>6&63|128,63&e|128);}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;i.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128);}}return i}function j(t){for(var r=[],e=0;e<t.length;++e)r.push(255&t.charCodeAt(e));return r}function F(t,r){for(var e,n,o,i=[],u=0;u<t.length&&!((r-=2)<0);++u)e=t.charCodeAt(u),n=e>>8,o=e%256,i.push(o),i.push(n);return i}function z(t){return q.toByteArray(Y(t))}function H(t,r,e,n){for(var o=0;o<n&&!(o+e>=r.length||o>=t.length);++o)r[o+e]=t[o];return o}function J(t,r){return t instanceof r||null!=t&&null!=t.constructor&&null!=t.constructor.name&&t.constructor.name===r.name}function K(t){return t!==t}var q=t("base64-js"),V=t("ieee754"),Q="function"==typeof Symbol&&"function"==typeof Symbol.for?Symbol.for("nodejs.util.inspect.custom"):null;e.Buffer=o,e.SlowBuffer=p,e.INSPECT_MAX_BYTES=50;var $=2147483647;e.kMaxLength=$,o.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1),r={foo:function(){return 42}};return Object.setPrototypeOf(r,Uint8Array.prototype),Object.setPrototypeOf(t,r),42===t.foo()}catch(t){return !1}}(),o.TYPED_ARRAY_SUPPORT||"undefined"==typeof console||"function"!=typeof console.error||console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),Object.defineProperty(o.prototype,"parent",{enumerable:!0,get:function(){if(o.isBuffer(this))return this.buffer}}),Object.defineProperty(o.prototype,"offset",{enumerable:!0,get:function(){if(o.isBuffer(this))return this.byteOffset}}),"undefined"!=typeof Symbol&&null!=Symbol.species&&o[Symbol.species]===o&&Object.defineProperty(o,Symbol.species,{value:null,configurable:!0,enumerable:!1,writable:!1}),o.poolSize=8192,o.from=function(t,r,e){return i(t,r,e)},Object.setPrototypeOf(o.prototype,Uint8Array.prototype),Object.setPrototypeOf(o,Uint8Array),o.alloc=function(t,r,e){return a(t,r,e)},o.allocUnsafe=function(t){return f(t)},o.allocUnsafeSlow=function(t){return f(t)},o.isBuffer=function(t){return null!=t&&!0===t._isBuffer&&t!==o.prototype},o.compare=function(t,r){if(J(t,Uint8Array)&&(t=o.from(t,t.offset,t.byteLength)),J(r,Uint8Array)&&(r=o.from(r,r.offset,r.byteLength)),!o.isBuffer(t)||!o.isBuffer(r))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(t===r)return 0;for(var e=t.length,n=r.length,i=0,u=Math.min(e,n);i<u;++i)if(t[i]!==r[i]){e=t[i],n=r[i];break}return e<n?-1:n<e?1:0},o.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return !0;default:return !1}},o.concat=function(t,r){if(!Array.isArray(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return o.alloc(0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var n=o.allocUnsafe(r),i=0;for(e=0;e<t.length;++e){var u=t[e];if(J(u,Uint8Array)&&(u=o.from(u)),!o.isBuffer(u))throw new TypeError('"list" argument must be an Array of Buffers');u.copy(n,i),i+=u.length;}return n},o.byteLength=d,o.prototype._isBuffer=!0,o.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var r=0;r<t;r+=2)v(this,r,r+1);return this},o.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var r=0;r<t;r+=4)v(this,r,r+3),v(this,r+1,r+2);return this},o.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var r=0;r<t;r+=8)v(this,r,r+7),v(this,r+1,r+6),v(this,r+2,r+5),v(this,r+3,r+4);return this},o.prototype.toString=function(){var t=this.length;return 0===t?"":0===arguments.length?P(this,0,t):y.apply(this,arguments)},o.prototype.toLocaleString=o.prototype.toString,o.prototype.equals=function(t){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===o.compare(this,t)},o.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return t=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(t+=" ... "),"<Buffer "+t+">"},Q&&(o.prototype[Q]=o.prototype.inspect),o.prototype.compare=function(t,r,e,n,i){if(J(t,Uint8Array)&&(t=o.from(t,t.offset,t.byteLength)),!o.isBuffer(t))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof t);if(void 0===r&&(r=0),void 0===e&&(e=t?t.length:0),void 0===n&&(n=0),void 0===i&&(i=this.length),r<0||e>t.length||n<0||i>this.length)throw new RangeError("out of range index");if(n>=i&&r>=e)return 0;if(n>=i)return -1;if(r>=e)return 1;if(r>>>=0,e>>>=0,n>>>=0,i>>>=0,this===t)return 0;for(var u=i-n,a=e-r,f=Math.min(u,a),s=this.slice(n,i),h=t.slice(r,e),c=0;c<f;++c)if(s[c]!==h[c]){u=s[c],a=h[c];break}return u<a?-1:a<u?1:0},o.prototype.includes=function(t,r,e){return -1!==this.indexOf(t,r,e)},o.prototype.indexOf=function(t,r,e){return w(this,t,r,e,!0)},o.prototype.lastIndexOf=function(t,r,e){return w(this,t,r,e,!1)},o.prototype.write=function(t,r,e,n){if(void 0===r)n="utf8",e=this.length,r=0;else if(void 0===e&&"string"==typeof r)n=r,e=this.length,r=0;else{if(!isFinite(r))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");r>>>=0,isFinite(e)?(e>>>=0,void 0===n&&(n="utf8")):(n=e,e=void 0);}var o=this.length-r;if((void 0===e||e>o)&&(e=o),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var i=!1;;)switch(n){case"hex":return b(this,t,r,e);case"utf8":case"utf-8":return E(this,t,r,e);case"ascii":return A(this,t,r,e);case"latin1":case"binary":return B(this,t,r,e);case"base64":return T(this,t,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return R(this,t,r,e);default:if(i)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),i=!0;}},o.prototype.toJSON=function(){return {type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var X=4096;o.prototype.slice=function(t,r){var e=this.length;t=~~t,r=void 0===r?e:~~r,t<0?(t+=e)<0&&(t=0):t>e&&(t=e),r<0?(r+=e)<0&&(r=0):r>e&&(r=e),r<t&&(r=t);var n=this.subarray(t,r);return Object.setPrototypeOf(n,o.prototype),n},o.prototype.readUIntLE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t],o=1,i=0;++i<r&&(o*=256);)n+=this[t+i]*o;return n},o.prototype.readUIntBE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t+--r],o=1;r>0&&(o*=256);)n+=this[t+--r]*o;return n},o.prototype.readUInt8=function(t,r){return t>>>=0,r||L(t,1,this.length),this[t]},o.prototype.readUInt16LE=function(t,r){return t>>>=0,r||L(t,2,this.length),this[t]|this[t+1]<<8},o.prototype.readUInt16BE=function(t,r){return t>>>=0,r||L(t,2,this.length),this[t]<<8|this[t+1]},o.prototype.readUInt32LE=function(t,r){return t>>>=0,r||L(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},o.prototype.readUInt32BE=function(t,r){return t>>>=0,r||L(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},o.prototype.readIntLE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t],o=1,i=0;++i<r&&(o*=256);)n+=this[t+i]*o;return o*=128,n>=o&&(n-=Math.pow(2,8*r)),n},o.prototype.readIntBE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=r,o=1,i=this[t+--n];n>0&&(o*=256);)i+=this[t+--n]*o;return o*=128,i>=o&&(i-=Math.pow(2,8*r)),i},o.prototype.readInt8=function(t,r){return t>>>=0,r||L(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},o.prototype.readInt16LE=function(t,r){t>>>=0,r||L(t,2,this.length);var e=this[t]|this[t+1]<<8;return 32768&e?4294901760|e:e},o.prototype.readInt16BE=function(t,r){t>>>=0,r||L(t,2,this.length);var e=this[t+1]|this[t]<<8;return 32768&e?4294901760|e:e},o.prototype.readInt32LE=function(t,r){return t>>>=0,r||L(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},o.prototype.readInt32BE=function(t,r){return t>>>=0,r||L(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},o.prototype.readFloatLE=function(t,r){return t>>>=0,r||L(t,4,this.length),V.read(this,t,!0,23,4)},o.prototype.readFloatBE=function(t,r){return t>>>=0,r||L(t,4,this.length),V.read(this,t,!1,23,4)},o.prototype.readDoubleLE=function(t,r){return t>>>=0,r||L(t,8,this.length),V.read(this,t,!0,52,8)},o.prototype.readDoubleBE=function(t,r){return t>>>=0,r||L(t,8,this.length),V.read(this,t,!1,52,8)},o.prototype.writeUIntLE=function(t,r,e,n){if(t=+t,r>>>=0,e>>>=0,!n){x(this,t,r,e,Math.pow(2,8*e)-1,0);}var o=1,i=0;for(this[r]=255&t;++i<e&&(o*=256);)this[r+i]=t/o&255;return r+e},o.prototype.writeUIntBE=function(t,r,e,n){if(t=+t,r>>>=0,e>>>=0,!n){x(this,t,r,e,Math.pow(2,8*e)-1,0);}var o=e-1,i=1;for(this[r+o]=255&t;--o>=0&&(i*=256);)this[r+o]=t/i&255;return r+e},o.prototype.writeUInt8=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,1,255,0),this[r]=255&t,r+1},o.prototype.writeUInt16LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,65535,0),this[r]=255&t,this[r+1]=t>>>8,r+2},o.prototype.writeUInt16BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,65535,0),this[r]=t>>>8,this[r+1]=255&t,r+2},o.prototype.writeUInt32LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,4294967295,0),this[r+3]=t>>>24,this[r+2]=t>>>16,this[r+1]=t>>>8,this[r]=255&t,r+4},o.prototype.writeUInt32BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,4294967295,0),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},o.prototype.writeIntLE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var o=Math.pow(2,8*e-1);x(this,t,r,e,o-1,-o);}var i=0,u=1,a=0;for(this[r]=255&t;++i<e&&(u*=256);)t<0&&0===a&&0!==this[r+i-1]&&(a=1),this[r+i]=(t/u>>0)-a&255;return r+e},o.prototype.writeIntBE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var o=Math.pow(2,8*e-1);x(this,t,r,e,o-1,-o);}var i=e-1,u=1,a=0;for(this[r+i]=255&t;--i>=0&&(u*=256);)t<0&&0===a&&0!==this[r+i+1]&&(a=1),this[r+i]=(t/u>>0)-a&255;return r+e},o.prototype.writeInt8=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,1,127,-128),t<0&&(t=255+t+1),this[r]=255&t,r+1},o.prototype.writeInt16LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,32767,-32768),this[r]=255&t,this[r+1]=t>>>8,r+2},o.prototype.writeInt16BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,32767,-32768),this[r]=t>>>8,this[r+1]=255&t,r+2},o.prototype.writeInt32LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,2147483647,-2147483648),this[r]=255&t,this[r+1]=t>>>8,this[r+2]=t>>>16,this[r+3]=t>>>24,r+4},o.prototype.writeInt32BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},o.prototype.writeFloatLE=function(t,r,e){return k(this,t,r,!0,e)},o.prototype.writeFloatBE=function(t,r,e){return k(this,t,r,!1,e)},o.prototype.writeDoubleLE=function(t,r,e){return O(this,t,r,!0,e)},o.prototype.writeDoubleBE=function(t,r,e){return O(this,t,r,!1,e)},o.prototype.copy=function(t,r,e,n){if(!o.isBuffer(t))throw new TypeError("argument should be a Buffer");if(e||(e=0),n||0===n||(n=this.length),r>=t.length&&(r=t.length),r||(r=0),n>0&&n<e&&(n=e),n===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-r<n-e&&(n=t.length-r+e);var i=n-e;if(this===t&&"function"==typeof Uint8Array.prototype.copyWithin)this.copyWithin(r,e,n);else if(this===t&&e<r&&r<n)for(var u=i-1;u>=0;--u)t[u+r]=this[u+e];else Uint8Array.prototype.set.call(t,this.subarray(e,n),r);return i},o.prototype.fill=function(t,r,e,n){if("string"==typeof t){if("string"==typeof r?(n=r,r=0,e=this.length):"string"==typeof e&&(n=e,e=this.length),void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!o.isEncoding(n))throw new TypeError("Unknown encoding: "+n);if(1===t.length){var i=t.charCodeAt(0);("utf8"===n&&i<128||"latin1"===n)&&(t=i);}}else"number"==typeof t?t&=255:"boolean"==typeof t&&(t=Number(t));if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0);var u;if("number"==typeof t)for(u=r;u<e;++u)this[u]=t;else{var a=o.isBuffer(t)?t:o.from(t,n),f=a.length;if(0===f)throw new TypeError('The value "'+t+'" is invalid for argument "value"');for(u=0;u<e-r;++u)this[u+r]=a[u%f];}return this};var Z=/[^+\/0-9A-Za-z-_]/g,W=function(){for(var t=new Array(256),r=0;r<16;++r)for(var e=16*r,n=0;n<16;++n)t[e+n]="0123456789abcdef"[r]+"0123456789abcdef"[n];return t}();},{"base64-js":29,ieee754:32}],31:[function(t,r,e){var n={single_source_shortest_paths:function(t,r,e){var o={},i={};i[r]=0;var u=n.PriorityQueue.make();u.push(r,0);for(var a,f,s,h,c,l,g,p;!u.empty();){a=u.pop(),f=a.value,h=a.cost,c=t[f]||{};for(s in c)c.hasOwnProperty(s)&&(l=c[s],g=h+l,p=i[s],(void 0===i[s]||p>g)&&(i[s]=g,u.push(s,g),o[s]=f));}if(void 0!==e&&void 0===i[e]){var d=["Could not find a path from ",r," to ",e,"."].join("");throw new Error(d)}return o},extract_shortest_path_from_predecessor_list:function(t,r){for(var e=[],n=r;n;)e.push(n),t[n],n=t[n];return e.reverse(),e},find_path:function(t,r,e){var o=n.single_source_shortest_paths(t,r,e);return n.extract_shortest_path_from_predecessor_list(o,e)},PriorityQueue:{make:function(t){var r,e=n.PriorityQueue,o={};t=t||{};for(r in e)e.hasOwnProperty(r)&&(o[r]=e[r]);return o.queue=[],o.sorter=t.sorter||e.default_sorter,o},default_sorter:function(t,r){return t.cost-r.cost},push:function(t,r){var e={value:t,cost:r};this.queue.push(e),this.queue.sort(this.sorter);},pop:function(){return this.queue.shift()},empty:function(){return 0===this.queue.length}}};void 0!==r&&(r.exports=n);},{}],32:[function(t,r,e){e.read=function(t,r,e,n,o){var i,u,a=8*o-n-1,f=(1<<a)-1,s=f>>1,h=-7,c=e?o-1:0,l=e?-1:1,g=t[r+c];for(c+=l,i=g&(1<<-h)-1,g>>=-h,h+=a;h>0;i=256*i+t[r+c],c+=l,h-=8);for(u=i&(1<<-h)-1,i>>=-h,h+=n;h>0;u=256*u+t[r+c],c+=l,h-=8);if(0===i)i=1-s;else{if(i===f)return u?NaN:1/0*(g?-1:1);u+=Math.pow(2,n),i-=s;}return (g?-1:1)*u*Math.pow(2,i-n)},e.write=function(t,r,e,n,o,i){var u,a,f,s=8*i-o-1,h=(1<<s)-1,c=h>>1,l=23===o?Math.pow(2,-24)-Math.pow(2,-77):0,g=n?0:i-1,p=n?1:-1,d=r<0||0===r&&1/r<0?1:0;for(r=Math.abs(r),isNaN(r)||r===1/0?(a=isNaN(r)?1:0,u=h):(u=Math.floor(Math.log(r)/Math.LN2),r*(f=Math.pow(2,-u))<1&&(u--,f*=2),r+=u+c>=1?l/f:l*Math.pow(2,1-c),r*f>=2&&(u++,f/=2),u+c>=h?(a=0,u=h):u+c>=1?(a=(r*f-1)*Math.pow(2,o),u+=c):(a=r*Math.pow(2,c-1)*Math.pow(2,o),u=0));o>=8;t[e+g]=255&a,g+=p,a/=256,o-=8);for(u=u<<o|a,s+=o;s>0;t[e+g]=255&u,g+=p,u/=256,s-=8);t[e+g-p]|=128*d;};},{}],33:[function(t,r,e){var n={}.toString;r.exports=Array.isArray||function(t){return "[object Array]"==n.call(t)};},{}]},{},[24])(24)});

});

var qrcode$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': qrcode,
  __moduleExports: qrcode
});

module.exports = LeofcoinApi;

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
var DiscoServer = _interopDefault(require('disco-server'));
var SocketClient = _interopDefault(require('socket-request-client'));
var IpfsHttpClient = _interopDefault(require('ipfs-http-client'));

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

const { globSource } = IpfsHttpClient;
// import globalApi from './global-api.js';
let hasDaemon = false;
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc' }) {
    super();
    this.peerMap = new Map();
    this.discoClientMap = new Map();
    if (options.init) return this._init(options)
  }
  
  async hasDaemon() {
    try {
      let response = await fetch('http://127.0.0.1:5050/api/version');
      response = await response.text();
      if (!isNaN(Number(response))) return true
      else return false
    } catch (e) {
      return false
    }
  }
  
  async _init({start, bootstrap}) {
    hasDaemon = await this.hasDaemon();
    let config;
    if (hasDaemon) {
      const response = await fetch('http://127.0.0.1:5050/api/config');
      config = await response.json();
    } else {
      await new Promise(async (resolve, reject) => {
        if (!globalThis.LeofcoinStorage) {
          const imported = await Promise.resolve().then(function () { return level; });
          globalThis.LeofcoinStorage = imported.default;
        }
        resolve();
      });
      
      globalThis.accountStore = new LeofcoinStorage('lfc-account');
      globalThis.configStore = new LeofcoinStorage('lfc-config');
      const account = await accountStore.get();
      
      config = await configStore.get();
      if (!config.identity) {
        await configStore.put(config);
        config.identity = await generateProfile();
        await accountStore.put({ public: { walletId: config.identity.walletId }});
        await configStore.put(config);
      }
    }
    if (start) await this.start(config, bootstrap);
    return this;
  }
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}, bootstrap) {
    if (hasDaemon) this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
    else {
      await new Promise(async (resolve, reject) => {
        if (!globalThis.Ipfs) {
          globalThis.Ipfs = require('./node_modules/ipfs/dist/index.min.js');
        }        
        resolve();
      });
      
      if (bootstrap === 'lfc') bootstrap = [
        '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs'
      ];
      
      if (!https && !globalThis.navigator) config.Addresses = {
      
        Swarm: [
          '/ip4/0.0.0.0/tcp/4030/ws',
          '/ip4/0.0.0.0/tcp/4020'
        ],
        Gateway: '/ip4/0.0.0.0/tcp/8080',
        API: '/ip4/127.0.0.1/tcp/5555'
      };
      
      config = {
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
          switch: {
            maxParallelDials: globalThis.navigator ? 10 : 100
          },
          config: {
            dht: {
              enabled: true
            },
            peerDiscovery: {
              autoDial: false
            }     
          }
        },
        config: {
          Bootstrap: bootstrap,
          Discovery: {
            MDNS: {
              Enabled: !globalThis.navigator,
              Interval: 1000
            },
            webRTCStar: {
              Enabled: true
            }
          },
          Swarm: {
            ConnMgr: {
              LowWater: 200,
              HighWater: 500
            }
          },
          Addresses: config.Addresses,
          API: {
            HTTPHeaders: {
              'Access-Control-Allow-Origin': ['*'],
              'Access-Control-Allow-Methods': ['GET', 'PUT', 'POST']
            }
          }
        },
        relay: {
          enabled: true,
          hop: { enabled: true, active: true }
        },
        EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
      };
      try {
        this.ipfs = await Ipfs.create(config);
        const { id, addresses } = await this.ipfs.id();
        this.addresses = addresses;
        this.peerId = id;     
        
        const strap = await this.ipfs.config.get('Bootstrap');
        for (const addr of strap) {
          await this.ipfs.swarm.connect(addr);
        }
      } catch (e) {
        console.error(e);
      }
    }
    // TODO: encrypt config
    try {
      if (!https && !globalThis.window) {
        this.discoServer = await new DiscoServer({
          port: 4455,
          protocol: 'disco',
          bootstrap: [
            { address: 'wss://star.leofcoin.org/disco', protocols: 'disco' }
          ]}, {
          chainHeight: (response) => response.send(globalThis.chain.length),
          chainIndex: (response) => response.send(globalThis.chain.length - 1),
          blockHash: (params, response) => 
            response.send(globalThis.chain[params].hash),
          lastBlock: response => {
            const index = (globalThis.chain.length - 1);
            response.send(globalThis.chain[index]);
          } 
        });
      } else {
        try {
          const client = await SocketClient('wss://star.leofcoin.org/disco', 'disco');
          const peers = await client.peernet.join({
            address: addresses[addresses.length - 1],
            peerId: this.peerId
          });
          for (const peer of peers) {
            try {
              await this.ipfs.swarm.connect(peer);
            } catch (e) {
              console.warn(e);
            }
          }
          this.discoClientMap.set('star.leofcoin.org', client);
        } catch (e) {
          console.error(e);
        }
      }
      
      this.ipfs.libp2p.on('peer:discover', peerInfo => {
        const peerId = peerInfo.id.toB58String();
        // TODO: disco
        this.peerMap.set(peerId, {connected: false, discoPeer: false});
      });
      this.ipfs.libp2p.on('peer:connect', peerInfo => {
        const peerId = peerInfo.id.toB58String();
        let info = this.peerMap.get(peerId);
        if (!info) info = { discoPeer: false };
        info.connected = true;
        this.peerMap.set(peerId, info);
      });
      this.ipfs.libp2p.on('peer:disconnect', peerInfo => {
        const peerId = peerInfo.id.toB58String();
        const info = this.peerMap.get(peerId);
        if (info && info.discoPeer) {
          this.peerMap.get(peerId, info);
          info.connected = false;
        }
        else this.peerMap.delete(peerId);
      });
    } catch (e) {
      console.error(e);
    }

    this.api = {
      addFromFs: async (path, recursive = true) => {
        console.log(globSource(path, { recursive }));
        const files = [];
        for await (const file of this.ipfs.add(globSource(path, { recursive }))) {
          files.push(file);
        }
        return files;
      }
    };
    // await globalApi(this)
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
      let _path = homedir();
      const parts = root.split('/');
      if (e.code === 'ENOENT') {
        
        if (parts.length > 0) {
          for (const path of parts) {
            _path = join(_path, path);
            try {
              readdirSync(_path);
            } catch (e) {
              if (e.code === 'ENOENT') mkdirSync(_path);
              else throw e
            }
          }
        } else {
          mkdirSync(this.root);
        }
      } else throw e
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

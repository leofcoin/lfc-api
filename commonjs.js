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
var AES = _interopDefault(require('crypto-js/aes.js'));
require('crypto-js/enc-utf8.js');
var QRCode = _interopDefault(require('qrcode'));
var DiscoBus = _interopDefault(require('@leofcoin/disco-bus'));
var multicodec = _interopDefault(require('multicodec'));
require('ipld-lfc');
require('ipld-lfc-tx');
var DiscoServer = _interopDefault(require('disco-server'));
var SocketClient = _interopDefault(require('socket-request-client'));

const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
};

const expected = (expected, actual) => {
  const entries = Object.entries(actual)
    .map(entry => entry.join(!entry[1] ? `: undefined - ${entry[1]} ` : `: ${typeof entry[1]} - `));

  return `\nExpected:\n\t${expected.join('\n\t')}\n\nactual:\n\t${entries.join('\n\t')}`;
};

const generateQR = async (input, options = {}) => {
  options = { ...DEFAULT_QR_OPTIONS, ...options };

  
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
    walletId: external.id
  }
};

const account = {
  import: async (identity, password) => {
    if (!identity) throw new Error('expected identity to be defined')
    if (identity.mnemonic) {
      const wallet = new MultiWallet('leofcoin:olivia');
      wallet.recover(identity.mnemonic);
      const account = wallet.account(0);
      const external = account.external(0);
      identity = {
        mnemonic: identity.mnemonic,
        publicKey: external.publicKey,
        privateKey: external.privateKey,
        walletId: external.id
      };
    }
    let config = await configStore.get();
    config = { ...config, ...{ identity } };
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

var account$1 = { 
  generateQR,
  generateProfileQR,
  generateProfile,
  account
};

let hasDaemon = false;
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc', forceJS: false }) {
    super();
    this.peerMap = new Map();
    this.discoClientMap = new Map();
    this.account = account$1;
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
  
  async _init({start, bootstrap, forceJS}) {
    hasDaemon = await this.hasDaemon();
    let config;
    if (hasDaemon && !forceJS) {
      let response = await fetch('http://127.0.0.1:5050/api/config');
      config = await response.json();
      const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource; 
      this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
    } else {
      if (!https && !globalThis.navigator && !forceJS) {
        const { run } = require('@leofcoin/daemon');
      await run();
        const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource;
        this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
      } else {
        await new Promise((resolve, reject) => {
      if (!LeofcoinStorage) LeofcoinStorage = require('lfc-storage');
      resolve();
    });
        
        if (hasDaemon) {
          config = await response.json();  
        } else {
          globalThis.accountStore = new LeofcoinStorage('lfc-account');
          globalThis.configStore = new LeofcoinStorage('lfc-config');
          const account = await accountStore.get();
          
          config = await configStore.get();
          if (!config.identity) {
            await configStore.put(config);
            config.identity = await this.account.generateProfile();
            await accountStore.put({ public: { walletId: config.identity.walletId }});
            await configStore.put(config);
          }  
        }        
        await this.spawnJsNode(config, bootstrap);
      }      
    }
    if (start) await this.start(config, bootstrap);
    return this;
  }
  
  async spawnJsNode (config, bootstrap) {    
    await new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve();
      });
    
    if (bootstrap === 'lfc') bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs'
    ];
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
          maxParallelDials: 10
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
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}, bootstrap) {
    // if (!https && !globalThis.navigator) config.Addresses = {
    // 
    //   Swarm: [
    //     '/ip4/0.0.0.0/tcp/4030/ws',
    //     '/ip4/0.0.0.0/tcp/4020'
    //   ],
    //   Gateway: '/ip4/0.0.0.0/tcp/8080',
    //   API: '/ip4/127.0.0.1/tcp/5555'
    // }
    
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

module.exports = LeofcoinApi;

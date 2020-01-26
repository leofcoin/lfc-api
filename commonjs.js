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
var DiscoServer = _interopDefault(require('disco-server'));
var SocketClient = _interopDefault(require('socket-request-client'));

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

const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true }, bootstrap) {
    super();
    this.peerMap = new Map();
    this.discoClientMap = new Map();
    if (options.init) return this._init(options)
  }
  
  async _init({start}, bootstrap) {
    await new Promise((resolve, reject) => {
      if (!LeofcoinStorage) LeofcoinStorage = require('lfc-storage');
      resolve();
    });
    
    globalThis.accountStore = new LeofcoinStorage('lfc-account');
    globalThis.configStore = new LeofcoinStorage('lfc-config');
    const account = await accountStore.get();
    
    const config = await configStore.get();
    if (!config.identity) {
      await configStore.put(config);
      config.identity = await generateProfile();
      await accountStore.put({ public: { walletId: config.identity.walletId }});
      await configStore.put(config);
    }
    if (start) await this.start(config, bootstrap);
    return this;
  }
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}, bootstrap = 'lfc') {
    await new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve();
      });
    
    if (bootstrap !== 'earth') config.Bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF',
      '/dns4/star.leofcoin.org/tcp/4002/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF',
      '/dns4/star.leofcoin.org/tcp/443/wss/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF'
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
        config: {
          dht: {
            enabled: true
          },
          peerDiscovery: {
            webrtcStar: {
              interval: 1000,
              enabled: false
            }  
          }
          
        }
      },
      config: {
        Bootstrap: config.Bootstrap,
        Addresses: {
        
          Swarm: [
            `/ip4/127.0.0.1/tcp/4002/ws`,
            `/ip4/127.0.0.1/tcp/4001`,
            `${https ? '/dns4/star.leofcoin.org/tcp/4444/wss/p2p-websocket-star/' : `/dns4/star.leofcoin.org/tcp/4430/ws/p2p-websocket-star/`}`
          ]
        }
      },
      relay: {
        enabled: true,
        hop: { enabled: true, active: !https }
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    };
    // TODO: encrypt config
    try {
      this.ipfs = await Ipfs.create(config);
      const { id, addresses } = await this.ipfs.id();
      this.addresses = addresses;
      this.peerId = id;
      
      if (!https) {
        this.discoServer = await new DiscoServer({port: 4455, protocol: 'disco'}, {
          
          // message: ()
          
        });
        const client = await SocketClient('ws://localhost:4455', 'disco');
        this.discoClientMap.set(this.peerId, client);
        console.log(this.discoServer);
        
        // this.discoServer.api.on('message', (message))
      }
      // const d =  await SocketClient({port: 4000, protocol: 'disco', address: '127.0.0.1'})
      // 
      // await d.request({url: 'ping'})
      // await d.request({url: 'peernet', params: { join: true }})
      // d.on('pubsub', async (ev) => {
      //   console.log(ev);
      //   await d.request({url: 'pubsub', params: {
      //       unsubscribe: true,
      //       value: 'hello'
      //     }
      //   })
      // })
      // await d.send({url: 'pubsub', params: { subscribe: true }})
      // const k = await d.request({url: 'pubsub', params: {
      //     value: 'hello'
      //   }
      // })
      // console.log(k);
      // console.log('ping');
      
      
      const client = await SocketClient('wss://star.leofcoin.org/disco', 'disco');
      // if (!https) client.join(4455, 'disco')
      
      this.discoClientMap.set('star.leofcoin.org', client);
      
      this.ipfs.libp2p.on('peer:discover', peerInfo => {
        const peerId = peerInfo.id.toB58String();
        console.log(`peer discovered: ${peerId}`);
        // TODO: disco
        this.peerMap.set(peerId, {connected: false, discoPeer: false});
      });
      this.ipfs.libp2p.on('peer:connect', peerInfo => {
        console.log(peerInfo.multiaddrs._multiaddrs[0].toString());
        const peerId = peerInfo.id.toB58String();
        console.log(`peer connected ${peerId}`);
        let info = this.peerMap.get(peerId);
        if (!info) info = { discoPeer: false };
        info.connected = true;
        this.peerMap.set(peerId, info);
      });
      this.ipfs.libp2p.on('peer:disconnect', peerInfo => {
        console.log(peerInfo.multiaddrs._multiaddrs[0].toString());
        const peerId = peerInfo.id.toB58String();
        console.log(`peer disconnected ${peerId}`);
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
    return this
  }
  
  
}

module.exports = LeofcoinApi;

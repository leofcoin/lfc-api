import { generateProfile } from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';
import DiscoServer from 'disco-server';
import SocketClient from 'socket-request-client'
import MultiWallet from 'multi-wallet';
import IpfsHttpClient from 'ipfs-http-client';
const { globSource } = IpfsHttpClient;
import { run } from '@leofcoin/daemon';
// import globalApi from './global-api.js';
let hasDaemon = false;
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc' }) {
    super()
    this.peerMap = new Map()
    this.discoClientMap = new Map()
    if (options.init) return this._init(options)
  }
  
  async hasDaemon() {
    try {
      let response = await fetch('http://127.0.0.1:5050/api/version')
      response = await response.text()
      if (!isNaN(Number(response))) return true
      else return false
    } catch (e) {
      return false
    }
  }
  
  async _init({start, bootstrap}) {
    hasDaemon = await this.hasDaemon()
    let config;
    if (hasDaemon) {
      let response = await fetch('http://127.0.0.1:5050/api/config')
      config = await response.json()      
      this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
    } else {
      if (!https && !globalThis.navigator) {
        await run()
        this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
      } else {
        await STORAGE_IMPORT
        
        globalThis.accountStore = new LeofcoinStorage('lfc-account')
        globalThis.configStore = new LeofcoinStorage('lfc-config')
        const account = await accountStore.get()
        
        config = await configStore.get()
        if (!config.identity) {
          await configStore.put(config)
          config.identity = await generateProfile()
          await accountStore.put({ public: { walletId: config.identity.walletId }});
          await configStore.put(config);
        }
        await this.spawnJsNode(config, bootstrap)
      }      
    }
    if (start) await this.start(config, bootstrap)
    return this;
  }
  
  async spawnJsNode (config, bootstrap) {    
    await IPFS_IMPORT
    
    if (bootstrap === 'lfc') bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs'
    ]
    config = {
      pass: config.identity.privateKey,
      repo: configStore.root,
      ipld: {
        async loadFormat (codec) {
          if (codec === multicodec.LEOFCOIN_BLOCK) {
            return import('ipld-lfc')
          } else if (codec === multicodec.LEOFCOIN_TX) {
            return import('ipld-lfc-tx')
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
    }
    
    try {
      this.ipfs = await Ipfs.create(config)
      const { id, addresses } = await this.ipfs.id()
      this.addresses = addresses
      this.peerId = id     
      
      const strap = await this.ipfs.config.get('Bootstrap')
      for (const addr of strap) {
        await this.ipfs.swarm.connect(addr)
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
            const index = (globalThis.chain.length - 1)
            response.send(globalThis.chain[index])
          } 
        })
      } else {
        try {
          const client = await SocketClient('wss://star.leofcoin.org/disco', 'disco')
          const peers = await client.peernet.join({
            address: addresses[addresses.length - 1],
            peerId: this.peerId
          })
          for (const peer of peers) {
            try {
              await this.ipfs.swarm.connect(peer)
            } catch (e) {
              console.warn(e);
            }
          }
          this.discoClientMap.set('star.leofcoin.org', client)
        } catch (e) {
          console.error(e);
        }
      }
      
      this.ipfs.libp2p.on('peer:discover', peerInfo => {
        const peerId = peerInfo.id.toB58String()
        // TODO: disco
        this.peerMap.set(peerId, {connected: false, discoPeer: false})
      })
      this.ipfs.libp2p.on('peer:connect', peerInfo => {
        const peerId = peerInfo.id.toB58String()
        let info = this.peerMap.get(peerId)
        if (!info) info = { discoPeer: false }
        info.connected = true
        this.peerMap.set(peerId, info)
      })
      this.ipfs.libp2p.on('peer:disconnect', peerInfo => {
        const peerId = peerInfo.id.toB58String()
        const info = this.peerMap.get(peerId)
        if (info && info.discoPeer) {
          this.peerMap.get(peerId, info)
          info.connected = false
        }
        else this.peerMap.delete(peerId)
      })
    } catch (e) {
      console.error(e);
    }

    this.api = {
      addFromFs: async (path, recursive = true) => {
        console.log(globSource(path, { recursive }));
        const files = []
        for await (const file of this.ipfs.add(globSource(path, { recursive }))) {
          files.push(file)
        }
        return files;
      }
    }
    // await globalApi(this)
    return this
  }
  
  
}

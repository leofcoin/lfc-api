import account from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';
import DiscoServer from 'disco-server';
import SocketClient from 'socket-request-client'
import MultiWallet from 'multi-wallet';
import DHT from 'libp2p-kad-dht';
import PeerInfo from 'peer-info';
import PeerId from 'peer-id';

let hasDaemon = false;
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc', forceJS: false }) {
    super()
    this.peerMap = new Map()
    this.discoClientMap = new Map()
    this.account = account
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
  
  async _init({start, bootstrap, forceJS}) {
    hasDaemon = await this.hasDaemon()
    let config;
    if (hasDaemon && !https && !forceJS) {
      let response = await fetch('http://127.0.0.1:5050/api/config')
      config = await response.json()
      GLOBSOURCE_IMPORT 
      this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
    } else {
      if (!https && !globalThis.navigator && !forceJS) {
        DAEMON_IMPORT
        GLOBSOURCE_IMPORT
        this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
      } else {
        await STORAGE_IMPORT
        
        if (hasDaemon && !https) {
          config = await response.json()  
        } else {
          globalThis.accountStore = new LeofcoinStorage('lfc-account')
          globalThis.configStore = new LeofcoinStorage('lfc-config')
          const account = await accountStore.get()
          
          config = await configStore.get()
          if (!config.identity) {
            await configStore.put(config)
            config.identity = await this.account.generateProfile()
            await accountStore.put({ public: { walletId: config.identity.walletId }});
            await configStore.put(config);
          }  
        }
        await this.spawnJsNode(config, bootstrap)
      }      
    }
    if (start) await this.start(config, bootstrap)
    return this;
  }
  
  async spawnJsNode (config, bootstrap) {    
    await IPFS_IMPORT
    
      if (!https && !globalThis.window) {
        config.Addresses = {
      
        Swarm: [
          '/ip4/0.0.0.0/tcp/4030/ws',
          '/ip4/0.0.0.0/tcp/4020',
        ],
        Gateway: '/ip4/0.0.0.0/tcp/8080',
        API: '/ip4/127.0.0.1/tcp/5555'
      }
      } else {
        config.Addresses = {
          Swarm: [],
          API: '',
          Gateway: '',
          Delegates: []        
        }
      }
      
    if (bootstrap === 'lfc') bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs'
    ]
    console.log(config.identity);
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
          maxParallelDials: 10
        },
        modules: {
          dht: DHT
        },
        config: {
          dht: {
            kBucketSize: 20,
            enabled: true,
            randomWalk: {
              enabled: true,            // Allows to disable discovery (enabled by default)
              interval: 300e3,
              timeout: 10e3
            }
          },
          webRTCStar: {
            enabled: true
          },
          peerDiscovery: {
            autoDial: false,
            websocketStar: {
              enabled: true
            }
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
          },
          websocketStar: {
            enabled: true
          }
        },
        Swarm: {
          ConnMgr: {
            LowWater: 200,
            HighWater: 500
          }
        },        
        Pubsub: {
          Enabled: true
        },
        Addresses: config.Addresses,
        API: {
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['http://localhost'],
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
      const { id, addresses, publicKey } = await this.ipfs.id()
      this.addresses = addresses
      this.peerId = id
      this.publicKey = publicKey
      
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
    // TODO: encrypt config
    try {
      if (!https && !globalThis.window) {
        this.discoServer = await new DiscoServer({
          peerId: this.peerId,
          ipfs: this.ipfs,
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
          this.client = await SocketClient('wss://star.leofcoin.org/disco', 'disco')
          let address = this.addresses[this.addresses.length - 1]
          this.client.pubsub.publish('peernet:join', this.peerId)
          this.client.pubsub.subscribe('peernet:join', async peer => {
            console.log(peer + ' joined');
            const peerInfo = await new PeerInfo(peer)
            peerInfo.multiaddrs.add('/p2p/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs/p2p-circuit')
            peerInfo.protocols.add('/ipfs/kad/1.0.0')
            this.ipfs.libp2p.emit('peer:discover', peerInfo)
            if (peerInfo.id !== this.peerId) await this.ipfs.swarm.connect(`/p2p/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs/p2p-circuit/p2p/${peerInfo.id}`)
          })
          this.client.pubsub.subscribe('peernet:message', msg => console.log(msg))
          if (!address) address = this.peerId
          console.log(address);
          // const peers = await client.peernet.join({
          //   address,
          //   peerId: this.peerId
          // })
          // for (const peer of peers) {
          //   if (peer) try {
          //     const peerInfo = await new PeerInfo(peer)
          //     peerInfo.multiaddrs.add('/p2p/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs/p2p-circuit')
          //     peerInfo.protocols.add('/ipfs/kad/1.0.0')
          //     this.ipfs.libp2p.emit('peer:discover', peerInfo)
          //     if (peer !== this.peerId) await this.ipfs.swarm.connect(`/p2p/QmamkpYGT25cCDYzD3JkQq7x9qBtdDWh4gfi8fCopiXXfs/p2p-circuit/p2p/${peer}`)
          // 
          //   } catch (e) {
          //     console.warn(e);
          //   }
          // }
          this.discoClientMap.set('star.leofcoin.org', this.client)
        } catch (e) {
          console.error(e);
        }
      }
      
      this.ipfs.libp2p.on('peer:discover', peerInfo => {
        console.log(`${peerInfo.id} discovered`);
        const peerId = PeerId.createFromB58String(peerInfo.id)
        console.log(peerId.toString());
        if (typeof peerInfo.id !== 'string') peerInfo.id = peerInfo.id.toB58String()
        if (this.peerMap.get(peerId.toString())) return
        this.peerMap.set(peerId.toString(), {connected: false, discoPeer: false})
        
        
      })
      this.ipfs.libp2p.on('peer:connect', peerInfo => {
        console.log(`${peerInfo.id} connected`);
        
        if (typeof peerInfo.id !== 'string') peerInfo.id = peerInfo.id.toB58String()
        let info = this.peerMap.get(peerInfo.id)
        if (!info) info = { discoPeer: false }
        info.connected = true
        this.peerMap.set(peerInfo.id, info)
      })
      this.ipfs.libp2p.on('peer:disconnect', peerInfo => {
        console.log(peerInfo);
        if (typeof peerInfo.id !== 'string') peerInfo.id = peerInfo.id.toB58String()
        const info = this.peerMap.get(peerInfo.id)
        if (info && info.discoPeer) {
          this.peerMap.get(peerInfo.id, info)
          info.connected = false
        }
        else this.peerMap.delete(peerInfo.id)
      })
    } catch (e) {
      console.error(e);
    }

    this.api = {
      addFromFs: async (path, recursive = true) => {
        if (!globalThis.globSource) {
          GLOBSOURCE_IMPORT
        }
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

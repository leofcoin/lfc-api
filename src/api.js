import { generateProfile } from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';
import DiscoServer from 'disco-server';
import SocketClient from 'socket-request-client'
import MultiWallet from 'multi-wallet';

const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true }, bootstrap) {
    super()
    this.peerMap = new Map()
    this.discoClientMap = new Map()
    if (options.init) return this._init(options)
  }
  
  async _init({start}, bootstrap) {
    await STORAGE_IMPORT
    
    globalThis.accountStore = new LeofcoinStorage('lfc-account')
    globalThis.configStore = new LeofcoinStorage('lfc-config')
    const account = await accountStore.get()
    
    const config = await configStore.get()
    if (!config.identity) {
      await configStore.put(config)
      config.identity = await generateProfile()
      await accountStore.put({ public: { walletId: config.identity.walletId }});
      await configStore.put(config);
    }
    if (start) await this.start(config, bootstrap)
    return this;
  }
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}, bootstrap = 'lfc') {
    await IPFS_IMPORT
    
    if (bootstrap !== 'earth') bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmNWhVfdRqTPVYmdbx9sJ4fADndYvuSL8GgC3jb2CmEAQB'
    ]
    
    // if (!https) config.Addresses = {
    // 
    //   Swarm: [
    //     '/dns4/star.leofcoin.org/tcp/4444/wss/p2p-websocket-star'
    //   ]
    // }
    // 
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
        config: {
          dht: {
            enabled: true
          }          
        }
      },
      config: {
        Bootstrap: bootstrap,
        Addresses: config.Addresses,
      },
      relay: {
        enabled: true,
        hop: { enabled: true, active: false }
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    }
    // TODO: encrypt config
    try {
      this.ipfs = await Ipfs.create(config)
      const { id, addresses } = await this.ipfs.id()
      this.addresses = addresses
      this.peerId = id
      
      if (!https && !globalThis.window) {
        this.discoServer = await new DiscoServer({port: 4455, protocol: 'disco', bootstrap: [
      { address: 'wss://star.leofcoin.org/disco', protocols: 'disco' }
    ]}, {
          
          // message: ()
          
        })
        // const client = await SocketClient('ws://localhost:4455', 'disco')
        // this.discoClientMap.set(this.peerId, client)
        // console.log(this.discoServer);
        
        // this.discoServer.api.on('message', (message))
      } else {
        const client = await SocketClient('wss://star.leofcoin.org/disco', 'disco')
        // if (!https) client.join(4455, 'disco')
        
        this.discoClientMap.set('star.leofcoin.org', client)
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
    return this
  }
  
  
}

import { generateProfile } from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';
import DiscoServer from 'disco-server';
import SocketClient from 'socket-request-client'
import MultiWallet from 'multi-wallet';
// import globalApi from './global-api.js';

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
  
  async _init({start, bootstrap}) {
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
  async start(config = {}, bootstrap) {
    await IPFS_IMPORT
    
    if (bootstrap === 'lfc') bootstrap = [
      '/dns4/star.leofcoin.org/tcp/4003/wss/ipfs/QmNWhVfdRqTPVYmdbx9sJ4fADndYvuSL8GgC3jb2CmEAQB'
    ]
    
    if (!https && !globalThis.window) config.Addresses = {
    
      Swarm: [
        '/ip4/127.0.0.1/tcp/4030/ws',
        '/ip4/127.0.0.1/tcp/4020',
        '/ip6/::/tcp/4010'
      ],
      Gateway: '/ip4/127.0.0.1/tcp/8080'
    }
    
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
        const client = await SocketClient('wss://star.leofcoin.org/disco', 'disco')
        
        this.discoClientMap.set('star.leofcoin.org', client)
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
    // await globalApi(this)
    return this
  }
  
  
}

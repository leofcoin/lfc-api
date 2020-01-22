import { generateProfile } from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';
import DiscoRoom from 'disco-room';

// import IPFS from 'ipfs';
import MultiWallet from 'multi-wallet';

const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true }, bootstrap) {
    super()
    if (options.init) return this._init(options)
  }
  
  async _init({start}, bootstrap) {
    await STORAGE_IMPORT
    
    globalThis.accountStore = new LeofcoinStorage('lfc-account')
    globalThis.configStore = new LeofcoinStorage('lfc-config')
    const account = await accountStore.get()
    
    const config = await configStore.get()
    console.log(config);
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
    
    if (bootstrap !== 'earth') config.Bootstrap = [
      `/ip4/star.leofcoin.org/tcp/4002/${https ? '4003/wss' : '4002/ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
      `/p2p-circuit/star.leofcoin.org/tcp/${https ? '4003/wss' : '4002/ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
      '/p2p-circuit/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF'
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
        config: {
          dht: {
            enabled: true
          }
        }
      },
      config: {
        Addresses: {
          Swarm: [
            `/dns/star.leofcoin.org/tcp/${https ? 4444 : 4430}/${https ? 'wss' : 'ws'}/p2p-websocket-star`,
          ]
        }
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    }
    // TODO: encrypt config
    try {
      this.ipfs = await Ipfs.create(config)
      const { id, addresses } = await this.ipfs.id()
      this.addresses = addresses
      this.peerId = id
      
      // this.discoRoom = await new DiscoRoom({
      //   discovery: {
      //     star: {
      //       protocol: 'lfc-message'
      //     },
      //     peers: [
      //       `/ip4/star.leofcoin.org/tcp/4002/${https ? '4003/wss' : '4002/ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
      //       `/p2p-circuit/star.leofcoin.org/tcp/${https ? '4003/wss' : '4002/ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
      //       '/p2p-circuit/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF'
      //     ]
      //   },
      //   identity: {
      //     peerId: id
      //   }
      // })
      
      this.ipfs.libp2p.on('peer:discover', peerInfo => {
        console.log(`peer discovered: ${peerInfo.id.toB58String()}`)
        peerMap.set(peerInfo.id.toB58String(), false)
      })
      this.ipfs.libp2p.on('peer:connect', peerInfo => {
        console.log(`peer connected ${peerInfo.id.toB58String()}`)
        peerMap.set(peerInfo.id.toB58String(), true)
      })
      this.ipfs.libp2p.on('peer:disconnect', peerInfo => {
      console.log(`peer disconnected ${peerInfo.id.toB58String()}`)
        peerMap.delete(peerInfo.id.toB58String())
      })
    } catch (e) {
      console.error(e);
    }
    return this
  }
  
  
}

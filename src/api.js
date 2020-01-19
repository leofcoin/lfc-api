import { generateProfile } from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from 'ipld-lfc';
import ipldLfcTx from 'ipld-lfc-tx';

// import IPFS from 'ipfs';
import MultiWallet from 'multi-wallet';

const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true }) {
    super()
    if (options.init) return this._init(options)
  }
  
  async _init({start}) {
    await STORAGE_IMPORT
    
    globalThis.accountStore = new LeofcoinStorage('lfc-account')
    globalThis.configStore = new LeofcoinStorage('lfc-config')
    const account = await accountStore.get()
    
    const config = await configStore.get()
    if (!config.identity) {
      await configStore.put(config)
      config.identity = await generateProfile()
      await accountStore.put({ public: { walletId: config.identity.walletId }});
    }
    if (start) await this.start(config)
    return this;
  }
  
  /**
   * spinup node
   * @param {object} config
   * @return {object} {addresses, id, ipfs}
   */
  async start(config = {}) {
    await IPFS_IMPORT
    
    // TODO: encrypt config
    try {
      this.ipfs = await Ipfs.create({
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
              `/ip4/45.137.149.26/tcp/${https ? 4444 : 4430}/${https ? 'wss' : 'ws'}/p2p-websocket-star`,
            ]
          },
          Bootstrap: [
            `/ip4/45.137.149.26/tcp/4002/${https ? 'wss' : 'ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`,
            `/p2p-circuit/ip4/45.137.149.26/tcp/4002/${https ? 'wss' : 'ws'}/ipfs/QmQRRacFueH9iKgUnHdwYvnC4jCwJLxcPhBmZapq6Xh1rF`
          ]
        },
        EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
      })
    } catch (e) {
      console.error(e);
    }
    
    const { id, addresses } = await this.ipfs.id()
    this.addresses = addresses;
    this.peerId = id;
    
    return this
    
  }
  
  
}

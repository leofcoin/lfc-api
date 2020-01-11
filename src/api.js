import { generateProfile } from './api/account'
import init from './api/init';
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import ipldLfc from './../node_modules/ipld-lfc/index';
import ipldLfcTx from './../node_modules/ipld-lfc-tx/index';

// import IPFS from 'ipfs';
import MultiWallet from 'multi-wallet';

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { config: {}, init: true, start: true }) {
    super()
    if (!options.config) options.config = {}
    if (options.init) return this._init(options)
  }
  
  async _init({config, start}) {
    config = await init(config)
    if (!config.identity) {
      config.identity = await generateProfile()
      
      await configStore.put(config)
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
            '/ip4/45.137.149.26/tcp/4430/ws/p2p-websocket-star'
          ]
        },
        Bootstrap: [          
          '/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/p2p-circuit/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/p2p-circuit/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
          '/ip4/45.137.149.26/tcp/4001/ipfs/QmP4tp5VoUNmGzApvFvQPkMXHLzafr7ULmhiswpeJ2fd4Z', 
          '/p2p-circuit/ip4/45.137.149.26/tcp/4001/ipfs/QmP4tp5VoUNmGzApvFvQPkMXHLzafr7ULmhiswpeJ2fd4Z'          
        ]
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    })
    
    const { id, addresses } = await this.ipfs.id()
    
    this.addresses = addresses;
    this.peerId = id;
    
    return this
    
  }
  
  
}

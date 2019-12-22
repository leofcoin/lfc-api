import { generateProfile } from './api/account'
import init from './api/init';
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';

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
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    })
    
    const { id, addresses } = await this.ipfs.id()
    
    this.addresses = addresses;
    this.peerId = id;
    // 
    // const strap = [
    //   '/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
    //   '/p2p-circuit/ip4/45.137.149.26/tcp/4003/ws/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
    //   '/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4',
    //   '/p2p-circuit/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4'
    // ]
    // 
    // for (const addr of strap) {
    //   await this.ipfs.swarm.connect(addr)
    // }
    // 
    return this
    
  }
  
  
}

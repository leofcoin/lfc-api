import config from './api/config'
import account from './api/account'
import init from './api/init';
import peernet from './api/peernet';
import { expected } from './utils.js';
import DiscoStar from 'disco-star';
import DiscoRoom from 'disco-room';

class SimpleDHT {
  constructor(config, discoRoom) {
    this.peers = discoRoom.peers
  }
  
  has(hash) {
    
  }
  
  get(hash) {
    
  }
}
export default class LeofcoinApi {
  constructor(options = { config: {}, init: true, start: true }) {
    if (!options.config) options.config = {}
    this.config = config;
    this.account = account;
    console.log(options.init);
    if (options.init) return this._init(options)
  }
  
  async _init({config, start}) {
    config = await init(config)
    if (!config.identity) {
      config.identity = await this.account.generateProfile()
      await configStore.put(config)
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    if (start) await this.start(config)
    return this;
  }
  
  async start(config = {}) {
    // spin up services
    try {      
      this.discoStar = await new DiscoStar(config)  
    } catch (e) {
      console.warn(`failed loading disco-star`)
    }
    
    this.discoRoom = await new DiscoRoom(config)
    this.peernet = new peernet(this.discoRoom);
    return
    // this.dht = new SimpleDHT(this.peernet)
  }
  // 
  // async request(multihash) {
  //   const providers = this.peernet.providers(multihash);
  //   const getFromClient = async (provider) => {
  //     const connection = await clientConnection(provider)
  //     return await connection.request({ url: 'get', params: { multihash }})
  //   }
  //   return await Promise.race([getFromClient(providers[0]), getFromClient(providers[1]]))    
  // }
  
  async pin(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    let data;
    try {
      data = await blockStore.get(hash)
    } catch (e) {
      data = await this.request(hash)
    }
    return this.put(hash, data)
  }
  
  async publish(hash, name) {
    if (!name) name = this.discoRoom.config.identity.peerId
    name = this.keys[name]
    
    if (!name) this.keys[name] = this.createNameKey(name);
    
    this.peernet.provide(name, hash)
  }
  
  async resolve(name) {
    // check published bucket of all peers
    if (!this.keys[name]) throw `${name} name hasn't published any data or is offline`
    else resolve(name)
  }
  
  async get(hash) {
    const providers = await this.peernet.providersFor(hash)
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.get(hash)
  }
  
  async put(hash, data) {
    if (!hash || !data) throw expected(['hash: String', 'data: Object', 'data: String', 'data: Number', 'data: Boolean'], { hash, data })
    return await blockStore.put(hash, data)
  }
  
  async rm(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.remove(hash)
  }
  
  async ls(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blockStore.ls(hash)
  }
}

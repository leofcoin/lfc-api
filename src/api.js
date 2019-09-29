import config from './api/config'
import account from './api/account'
import init from './api/init';
import peernet from './api/peernet';
import { expected } from './utils.js';

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
  constructor(_config = { init: true }) {
    this.config = config;
    this.account = account;
    if (_config.init) return this._init(_config)
  }
  
  async _init(_config = {}) {
    const config = await init(_config)
    console.log(config.services);
    if (!config.identity) {
      config.identity = await this.account.generateProfile()
      
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    // spin up services
    if (config.services) for (let service of config.services) {
      try {
        service = await import(`./node_modules/${service}/${service}.js`)
        service = service.default;
        this[service] = await new service(config)
        console.log(`${service} ready`);
      } catch (e) {
        console.error(`${service} failed to start`)
      }
    }
        
    this.peernet = new peernet(this.discoRoom);
    // this.dht = new SimpleDHT(this.peernet)
    return this;
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

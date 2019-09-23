import config from './api/config'
import account from './api/account'
import init from './api/init';

export default class LeofcoinApi {
  constructor(_config) {
    this.config = config;
    this.account = account;
    return this._init(_config)
  }
  
  async _init(_config = {}) {
    const config = await init(_config)
    if (!config.identity) {
      config.identity = await this.account.generateProfile()
      
      await accountStore.put({ public: { peerId: config.identity.peerId }});
    }
    return this;
  }
  
  
}

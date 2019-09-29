export default class Peernet {
  constructor(discoRoom) {
    this.discoRoom = discoRoom;
    
    this.providerMap = new Map();
    return this
  }
  
  get clientMap() {
    return this.discoRoom.clientMap
  }
  
  get peerMap() {
    return this.discoRoom.peerMap
  }  
  
  async getDistance(provider) {
    const request = `https://tools.keycdn.com/geo.json?host=${provider.address}`
    let response = await fetch(request)
    response = response.json()
    console.log(response);
  }
  
  async providersFor(hash) {
    let providers = this.providerMap.get(hash)
    if (!providers || providers.length === 0) {
      await this.walk(hash)
      providers = this.providerMap.get(hash)
    }
    
    let all = []
    
    for (const provider of providers) {
      all.push(this.getDistance(provider))
    }
    
    all = await Promise.all(all)
    
    const closestPeer = all.reduce((p, c) => {
      if (c.distance < p || p === 0) return c;
    }, 0)
    
    // closestPeer
    // await connection()
  }
  
  async walk(hash) {
    // perform a walk but resolve first encounter
    if (hash) {
      for (const entry of this.clientMap.entries()) {
        console.log(entry);
        console.log(entry[1].client.protocol);
        const result = await entry[1].request({url: 'has', params: { hash }})
        console.log(result);
        if (result) {
          let providers = []
          if (this.providerMap.has(hash)) {
            providers = this.providerMap.get(hash)
          }
          providers.push(entry[1])
          this.providerMap.set(hash, providers)
          if (!this.walking) this.walk()
          return this.peerMap.get(entry[0])
        }
      }      
    }
    
    this.walking = true;    
    for (const entry of this.clientMap.entries()) {
      entry[0].request({url: 'ls', params: {}})
    }
    this.walking = false;
  }
   
  get(contentHash) {
    this.providersFor(contentHash)
    // this.closestPeer()
  }
  
  put() {
    // iam provider
  }
  
  has() {
    // fd
  }
  
  /**
   * Tries removing content from the network
   * although it tries hard to remove the content from the network, 
   * when you only have the location of that content.
   * see [why is my content still available](https://github.com/leofcoin/leofcoin-api/FAQ.md#why-is-my-content-still-available)
   */
  remove() {
    // TODO: only if private and owner
    // public ledgers should not be allowed to request removal.
    // instead data should be allowed to die out over time
    // providers[hash] = []
    // result: meltdown = null
    // FYI when your the only one providing that hash, it's gone!
    // Peernet only resolves locations to that content.
    // if your unlucky and your content was popular,
    // people could have pinned your content and it's now available forever,
    // that's until they decide to remove the content of course.
    // but surely you didn't put sensitive information on a public network,
    // did you?
    // But you encrypted it, right?
  }
}
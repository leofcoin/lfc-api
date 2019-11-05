import fetch from 'node-fetch';
import { distanceInKmBetweenEarthCoordinates, parseAddress } from './../utils'
import clientConnection from 'socket-request-client';
import Dht from './dht-earth';
import proto from './proto'
import DiscoMessage from 'disco-message';
import MultiWallet from 'multi-wallet';

class DiscoData {
  constructor(data) {
    
  }
}
export default class Peernet {
  constructor(discoRoom, protoCall) {
    this.dht = new Dht()
    this.discoRoom = discoRoom;
    this.protocol = this.discoRoom.config.api.protocol
    this.port = this.discoRoom.config.api.port
    this.protoCall = protoCall;
    
    this.discoRoom.on('data', data => {
      console.log('incoming');
      console.log({data});
      
      let message = new DiscoMessage()
      message._encoded = data
      const decoded = message.decode();
      const wallet = new MultiWallet('leofcoin:olivia')
      wallet.fromId(decoded.from)
      console.log(decoded);
      const signature = decoded.signature
      delete decoded.signature
      message = new DiscoMessage(decoded)
      const verified = wallet.verify(signature, message.discoHash.digest.slice(0, 32))
      if (!verified) console.warn(`ignored message from ${decoded.from}
        reason: invalid signature`);
        
      console.log(decoded.data);
      
      if (message.discoHash.name) this.protoCall[message.discoHash.name][message.method](message.decoded)
    })
    return this
  }
  
  get providerMap() {
    return this.dht.providerMap
  }
  
  get clientMap() {
    return this.discoRoom.clientMap
  }
  
  get availablePeers() {
    return this.discoRoom.availablePeers
  }
  
  get peerMap() {
    return this.discoRoom.peerMap
  }
  
  get addProvider() {
    return this.dht.addProvider
  }
  
  async providersFor(hash) {
    let providers = await this.dht.providersFor(hash)
    if (!providers || providers.length === 0) {
      await this.walk(hash)
      providers = await this.dht.providersFor(hash)
      if (!providers || providers.length === 0) {
        await this.walk(hash)
        providers = await this.dht.providersFor(hash)
      }
    }
    return providers
  }
  
  
  
  async walk(hash) {
    // perform a walk but resolve first encounter
    console.log('walking');
    console.log(this.peerMap);
    console.log(this.availablePeers);
    if (hash) {
      for (const [peerID, peer] of this.peerMap.entries()) {
        console.log(peer);
        if (peer !== undefined) {
          const onerror = error => {
            
          }
          let result;
          try {
            let message = new DiscoMessage({data: hash}, {method: 'has'})
            const wallet = new MultiWallet('leofcoin:olivia')
            wallet.fromId(this.peerId)
            const signature = wallet.sign(message.discoHash.digest.slice(0, 32))
            message.encode(signature)
            message = await peer.request(message)
            console.log({message});
          } catch (error) {
            console.log({error});
          } finally {
            
          }
          console.log({result});
          if (result && result.value || typeof result === 'boolean' && result) {
            let providers = []
            const address = this.peerMap.get(peerId).reduce((p, c) => {
              const {address, protocol} = parseAddress(c)
              if (protocol === this.protocol) return c
              return p
            }, null)
            this.addProvider(address, hash)
            return this.peerMap.get(address)
          }  
        }
        
      }      
    }
    
    this.walking = true;    
    for (const [peerID, clients] of this.clientMap.entries()) {
      const client = clients[this.protocol]
      if (client) await client.request({url: 'ls', params: {}})
      // TODO: 
    }
    this.walking = false;
  }
   
  async get(hash) {
    console.log({hash});
    let providers = await this.providersFor(hash)
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`
    const closestPeer = await this.dht.closestPeer(providers)
    console.log({closestPeer});
    const { protocol, port, address, peerId } = parseAddress(closestPeer)    
    let client;
    if (this.clientMap.has(peerId)) {
      client = this.clientMap.get(peerId)
      client = client[protocol]
    }
    
    if (!client) {
       try {
         client = await clientConnection({port, protocol, address})  
       } catch (e) {
         this.route(hash, 'get')
         console.log({e});
         return
       } finally {
         
       }
    }
    
    if (client) {
      const data = {url: 'get', params: {hash}}
      try {
        const requested = await client.request(data);
      } catch (e) {
        console.log({e});
      }
      console.log({requested});  
    }
// a request is client.on & client.send combined
    
    
    // connection.send({url: 'get'})
    // this.closestPeer()
  }
  
  async route(hash, type = 'has') {
    console.log({hash});
    console.log(this.discoRoom.availablePeers);
    const peers = []
    let peer;
    for (const peer of  this.discoRoom.peerMap.values()) {
      peers.push(peer)
    }
    if (peers.length === 0) {
      for (const peer of  this.discoRoom.availablePeers.values()) {
        peers.push(peer)
      }  
      if (peers.length > 0) peer = await this.discoRoom.dial(peers[0])
      peer = peer.peer
      
    }
    console.log({peer, peers});
    peer.on('data', data => {
      console.log(data);
    })
    peer.send(JSON.stringify({
      method: 'has',
      hash
    }))
    const protocol = this.protocol
    for (const [peerId, clients] of this.clientMap.entries()) {      
      let client = clients[protocol]
      if (!client) {
        if (this.peerMap.has(peerId)) {
          const protoAddress = this.peerMap.get(peerId).reduce((p, c) => {
            const {address, protocol} = parseAddress(c)
            if (protocol === this.protocol) return c
            return p
          }, null)
          const { port, address, protocol } = parseAddress(protoAddress)
          client = await clientConnection({ port, address, protocol })
        }
      }
      // if (!client) client = protocols['disco-room']
      // console.log({client, clients});
      if (peerId !== this.discoRoom.peerId && client) {
        let result = await client.request({url: 'route', params: { type, protocol, hash, peerId: this.discoRoom.peerId, from: this.discoRoom.peerId }})  
        
        const address = result.addressBook.reduce((p, c) => {
          const {address, protocol} = parseAddress(c)
          if (protocol === this.protocol) return c
          return p
        }, null)
        
        if (type === 'has') {
          if (result.has) {
            this.addProvider(address, hash)
          }
        } else if (type === 'get') {
          if (result.value) {
            this.addProvider(address, hash)
          }
          
        }
        
        console.log({ result });
        return result.value
      }
      
      
    }
    return
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
import fetch from 'node-fetch';
import { distanceInKmBetweenEarthCoordinates, parseAddress } from './../utils'
import clientConnection from 'socket-request-client';
import Dht from './dht-earth';
import proto from './proto'
import DiscoMessage from './../../node_modules/disco-message/src/message.js';
import DiscoData from 'disco-data';
import DiscoCodec from 'disco-codec';
import DiscoHash from 'disco-hash';
import DiscoDHTData from './../../node_modules/disco-dht-data/src/dht-data';
import MultiWallet from 'multi-wallet';
import DiscoBus from '@leofcoin/disco-bus';

export default class Peernet extends DiscoBus {
  constructor(discoRoom, protoCall) {
    super()
    this.dht = new Dht()
    this.discoRoom = discoRoom;
    this.protocol = this.discoRoom.config.api.protocol
    this.port = this.discoRoom.config.api.port
    this.protoCall = protoCall;
    this.codecs = {
      'disco-dht': {
        codec: '6468',
        hashAlg: 'keccak-512'
      },
      'disco-data': {
        codec: '6464',
        hashAlg: 'keccak-512'
      }
    }
    this.discoRoom.subscribe('peer:left', peer => {
      
    })
    this.discoRoom.subscribe('data', async data => {
      console.log('incoming');
      let message = new DiscoMessage()
      message._encoded = data
      message.decode()
      if (message.from === this.discoRoom.peerId) return
      const decoded = message.decoded;
      const codec = new DiscoCodec(decoded.data)
      console.log({codec});
      const wallet = new MultiWallet('leofcoin:olivia')
      wallet.fromId(decoded.from)
      const signature = message.signature
      const verified = wallet.verify(signature, message.discoHash.digest.slice(0, 32))
      if (!verified) console.warn(`ignored message from ${decoded.from}
        reason: invalid signature`);
        
      // console.log(decoded.data.toString());
      
      if (codec.name) {
        if (this.protoCall[codec.name] && this.protoCall[codec.name][message.method]) {          
          try {
            let peer = this.peerMap.get(message.decoded.from)
            if (this.peerMap.has(message.decoded.from)) {
              peer = this.peerMap.get(message.decoded.from)
            } else {
              peer = this.availablePeers.get(message.decoded.from)
              peer = await this.discoRoom.dial(peer)
            }
            const data = await this.protoCall[codec.name][message.method](message)
            console.log({data});
            if (data !== undefined) {
              const method = message.method
              const id = message.id
              message = new DiscoMessage({from: this.discoRoom.peerId, to: message.from, data})
              message.method = method
              message.data = data
              message.id = id
              console.log(message);
              const wallet = new MultiWallet('leofcoin:olivia')
              wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia')
              const signature = wallet.sign(message.discoHash.digest.slice(0, 32))
              message.encode(signature)
              console.log(message.decode());
              await peer.send(message.encoded)
            }
          } catch (e) {
            console.log({e});
            // let peer;
            // if (e.code === 'ERR_ICE_CONNECTION_FAILURE') {
              // peer = this.availablePeers.get(message.decoded.from)
              // peer = await this.discoRoom.dial(peer)
              // this.peerMap.set(message.decoded.from, peer)
              // await peer.send(message.encoded)
            // } else {
              // console.error(e);  
                // console.log(e.includes('write after end'));
            // }            
          }
          
        } else { console.log(`unsupported protocol ${codec.name}`) }
        return
      }
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
      
    try {
      if (hash) {
        console.log({hash});
        const node = new DiscoDHTData()
        node.create({hash})
        node.encode();
        const data = node.encoded
        // console.log(node.decoded);
        console.log(data + 'node data');
        // console.log(node);
        const entries = this.peerMap.entries()
        for (const [peerID, peer] of entries) {
          console.log(peerID, peer);
          if (peer !== undefined) {
            const onerror = error => {
              console.log({error});
            }
            let result;
            try {
              console.log({peerID});
              if (peerID !== this.discoRoom.peerId) {
                let message = new DiscoMessage({data})
                message.from = this.discoRoom.peerId                
                message.to = peerID
                const info = this.discoRoom.availablePeers.get(message.to)
                message.method = 'has'
                const wallet = new MultiWallet('leofcoin:olivia')   
                wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia')
                const signature = wallet.sign(message.discoHash.digest.slice(0, 32))
                message.encode(signature)
                console.log(message.discoHash);
                try {
                  message.id = message.discoHash.encoded
                  peer.on('error', async e => {
                    try {
                      // peer.destroy()
                      this.discoRoom.peerMap.delete(peerID)
                      const info = this.discoRoom.availablePeers.get(peerID)
                      const dialResult = await this.discoRoom.dial(info)
                      message = new DiscoMessage({data})
                      message.from = this.discoRoom.peerId
                      message.to = dialResult.peerId
                      message.method = 'has'
                      const wallet = new MultiWallet('leofcoin:olivia')   
                      wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia')
                      const signature = wallet.sign(message.discoHash.digest.slice(0, 32))
                      message.encode(signature)
                      console.log(message.discoHash);
                      message = await dialResult.peer.request(message)
                      const discoMessage = new DiscoMessage()
                      discoMessage._encoded = message
                      discoMessage.decode()
                      console.log({discoMessage});
                      const node = new DiscoDHTData()
                      node.fromEncoded(discoMessage.decoded.data)
                      node.decode()
                      if (node.data && node.data.value === true) {
                        await this.addProvider(info, node.data.hash.toString())
                        return
                      }
                      // this.discoRoom.availablePeers.delete(peerID)
                    } catch (e) {
                      console.log({e})
                    }
                  })
                  message = await peer.request(message.encoded)
                  const discoMessage = new DiscoMessage()
                  discoMessage._encoded = message
                  discoMessage.decode()
                  console.log({discoMessage});
                  const node = new DiscoDHTData()
                  node.fromEncoded(discoMessage.decoded.data)
                  node.decode()
                  if (node.data && node.data.value === true) {
                    console.log(info);
                    await this.addProvider(info, node.data.hash.toString())
                    return
                  }
                  console.log({node}, node.data);
                } catch (e) {
                  console.log({e}, '2');
                }
              }
              
              
            } catch (error) {
              console.log({error});
            }
            console.log({result});
            // if (result && result.value || typeof result === 'boolean' && result) {
            //   let providers = []
            //   const address = this.peerMap.get(peerId).reduce((p, c) => {
            //     const {address, protocol} = parseAddress(c)
            //     if (protocol === this.protocol) return c
            //     return p
            //   }, null)
            //   this.addProvider(address, hash)
            //   return this.peerMap.get(address)
            // }
            return
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
    } catch (e) {
      console.error({e});
    }
  }
   
  async get(hash) {
    console.log({hash});
    let providers = await this.providersFor(hash)
    
    if (!providers || providers.size === 0) throw `nothing found for ${hash}`
    console.log({providers});
    const closestPeer = await this.dht.closestPeer(providers)
    console.log({closestPeer});
    // const { protocol, port, address, peerId } = parseAddress(closestPeer)    
    let peer;
    if (this.peerMap.has(closestPeer.peerId)) {
      peer = this.peerMap.get(closestPeer.peerId)
    } else {
      peer = await this.discoRoom.dial(closestPeer)
    }
    const codec = new DiscoCodec()
    codec.fromBs58(hash)
    const node = new DiscoData()
    node.create({ hash })
    node.encode()
    const data = node.encoded
    console.log({bs58: data});
    let message = new DiscoMessage({
      from: this.discoRoom.peerId, 
      to: closestPeer.peerId,
      data 
    })
    message.method = 'get'
    const wallet = new MultiWallet('leofcoin:olivia')   
    wallet.fromPrivateKey(Buffer.from(this.discoRoom.config.identity.privateKey, 'hex'), null, 'leofcoin:olivia')
    const signature = wallet.sign(message.discoHash.digest.slice(0, 32))
    message.encode(signature)
    console.log({message}, 'sending');
    try {
      message = await peer.request(message)
    } catch (e) {
      console.log({e});
      try {
        // peer = await this.discoRoom.dial(closestPeer)
        // this.peerMap.set(closestPeer.peerId, peer)
        message = await peer.send(message.encoded)
      } catch (e) {
        return
      }      
    }
    providers = await this.providersFor(hash)
    // console.log({message});
    if (!providers || providers.length === 0) throw `nothing found for ${hash}`;
    return globalThis.blocksStore.get(hash)
    
// a request is client.on & client.send combined
    
    
    // connection.send({url: 'get'})
    // this.closestPeer()
  }
  
  async route(hash, type = 'has') {
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
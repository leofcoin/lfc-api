'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var connection = _interopDefault(require('socket-request-client'));
var PubSub = _interopDefault(require('little-pubsub'));
var ip = require('ip');

// import allSettled from 'promise.allSettled'

const wss = typeof window !== 'undefined';

class DiscoRoom {
  constructor(config = {}) {
    this.pubsub = new PubSub();
    this.config = config;
    this.peers = [];
    this.clients = [];
    
    this.clientMap = new Map();
    this.peerMap = new Map();
    this.providerMap = new Map();
    
    this._onJoin = this._onJoin.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onError = this._onError.bind(this);
    
    return this._init();
  }
  
  isDomain(address) {
    if (ip.toLong(address) === 0) return true;
    return false;
  }
  
  async connect({peerId, port, address, protocol}) {
    if (this.isDomain(address) && !port) port = 8080;
    const client = await connection({port, address, protocol, peerId, wss});
    return {client, peerId}
  }
  
  async allSettled (array, unsettled = []) {
    const promises = array.map(peerInfo => this.connect(peerInfo));
    try {
      const settled = await Promise.all(promises);
      return settled
    } catch (e) {
      if (array.length > 0) return this.allSettled(array.filter(a => a.peerId !== e.peerId), unsettled)
      return settled
    }
  }
  
  async _init() {
    if (!this.config.discovery || !this.config.discovery.peers) throw new Error('expected config.discovery.peers to be defined')
    if (!this.config.identity || !this.config.identity.peerId) throw new Error('expected config.identity.peerId to be defined')
    const all = [];
    for (const star of this.config.discovery.peers) {
      const { port, address, protocol, peerId } = this.parseAddress(star);
      all.push({peerId, port, address, protocol});
    }
    for (const { peerId, client } of await this.allSettled(all)) {
      if (peerId) {
        if (client.client.readyState !== 3) {
          let star = this.config.discovery.star;
          if (!star) star = { protocol: 'disco-room', port: 80};
          const addressBook = [this.config.api, this.config.gateway, star];
          const peers = await client.request({url: 'join', params: { peerId: this.config.identity.peerId, addressBook } });
          
          for (const peer of peers) {
            console.log(peer);
            if (this.peers.indexOf(peer) === -1) this.peers.push(peer);
          }
          client.on('error', this._onError);
          client.on('join', this._onJoin);
          client.on('leave', this._onLeave);
          this.clientMap.set(peerId, client);  
        }  
      }      
    }
    
    process.on('SIGINT', async (m) => {
      console.log(m);
      console.log("Caught interrupt signal");
      process.exit();
      //graceful shutdown
    });
    
    process.on('exit', async (m) => {
      console.log("Caught interrupt signal");
      console.log(m);
      // await star.stop();
      for (const entry of this.clientMap.entries()) {
        await entry[1].request({url: 'leave', params: {peerId: this.config.identity.peerId} });
      }
      setTimeout(async () => {
        process.exit();
      }, 50);
    }); 
    
    return this
  }
  
  parseAddress(address) {    
    const parts = address.split('/');
    if (this.isDomain(parts[0]) && isNaN(parts[1])) {
      return {
        address: parts[0],
        port: 8080,
        protocol: parts[1],
        peerId: parts[2]
      }
    }
    return {
      address: parts[0],
      port: Number(parts[1]),
      protocol: parts[2],
      peerId: parts[3]
    }
  }
  
  async dialPeer(peerId, { port, protocol, address }) {
    console.log(port, address);
    const client = await connection({ port, protocol, address, wss });
    client.on('join', this._onJoin);
    client.on('leave', this._onLeave);
    this.clientMap.set(peerId, client);
    this.pubsub.publish('dial', peerId);
    return
  }
  
  async _onJoin({ peerId, addressBook }) {
    // TODO: add limit to config
    if (!this.peerMap.has(peerId) && this.peerMap.size < 25) {
      try {
        const address = addressBook.reduce((p, c) => {
          const { protocol, port, address } = this.parseAddress(c);
          if (protocol === this.config.discovery.star.protocol) return { protocol, port, address };
          return p;
        }, null);
        if (address) {
          await this.dialPeer(peerId, address);
          this.peerMap.set(peerId, addressBook);  
        }
        
      } catch (e) {
          console.warn({e});      
      }      
      this.pubsub.publish('join', { peerId, addressBook });
    }
  }
  
  _onLeave({ peerId }) {
    if (this.peerMap.has(peerId)) {
      this.peerMap.delete(peerId);
      this.clientMap.delete(peerId);
      this.pubsub.publish('leave', peerId);
    }
  }
  
  on(event, fn) {
    this.pubsub.subscribe(event, fn);
  }
  
  _onError(error) {
    if (this.pubsub.subscribers) return this.pubsub.publish('error', error)
    console.error(error);
  }
}

module.exports = DiscoRoom;

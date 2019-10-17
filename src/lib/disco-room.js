'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var connection = _interopDefault(require('socket-request-client'));
var PubSub = _interopDefault(require('little-pubsub'));
var ip = require('ip');

// import allSettled from 'promise.allSettled'

const wss = typeof window !== 'undefined';

class DiscoRoom {
  get peers() {
    const peers = [];
    if (this.peerMap.size > 0) {
      for (const entry of this.peerMap.entries()) {
        // family/address/port/id
        peers.push(entry[1]);
      }
    }
    return peers;
  }
  
  
  
  get protocol() {
    return this.config.discovery.star.protocol
  }
  get peerId() {
    return this.config.identity.peerId;
  }
  
  addProto(proto, fn) {
    console.log(proto);
    this.protos[proto] = fn;
  }
  constructor(config = {}) {
    this.pubsub = new PubSub();
    this.config = config;
    this.clients = [];
    this.clientMap = new Map();
    this.peerMap = new Map();
    this.providerMap = new Map();
    
    this._onJoin = this._onJoin.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onError = this._onError.bind(this);
    this._onRoute = this._onRoute.bind(this);
    
    this.protos = {
      'disco-room': async message => {
          if (message.from === this.peerId) return;
          
          if (!message.peers) {
            if (this.clientMap.has(message.from)) {
              const connections = this.clientMap.get(message.from);
              const connection = connections[message.protocol || message.type];
              console.log(connection);
              if (connection && connection.connected) {
                connection.send({
                  url: 'route', status: 200,
                  params: {
                    peerId: this.peerId,
                    from: this.peerId,
                    to: message.peerId,
                    peers: this.peers
                  }
                });    
              } else {
                const addresses = this.peerMap.get(message.from);
                const address = addresses.reduce((p, c) => {
                  const { protocol, port, address, peerId } = m.parseAddress(c);
                  if (protocol === message.protocol) return c;
                  return p;
                }, null);
                await dial(address);
                const connections = this.peerMap.get(message.from);                                
                const connection = connections[message.protocol || message.type];
                if (connection && connection.connected) {
                  connection.send({
                    url: 'route', status: 200,
                    params: {
                      peerId: this.peerId,
                      from: this.peerId,
                      to: message.peerId,
                      peers: this.peers
                    }
                  });    
                }
              }
              
            }
          } else {
            console.log({addressBook});
            for (const addressBook of message.peers) {
              const {peerId} = this.parseAddress(addressBook[0]);
              if (!this.peerMap.has(peerId)) {
                try {
                  const address = addressBook.reduce((p, c) => {
                    const { protocol, port, address } = this.parseAddress(c);
                    if (protocol === this.config.discovery.star.protocol) return { protocol, port, address };
                    return p;
                  }, null);
                  if (address) {
                    await this.dialPeer(peerId, address);
                    console.log('dial success');
                    this.peerMap.set(peerId, addressBook);  
                  }
                  
                } catch (e) {
                    console.warn({e});      
                }
              }
            }
          }
          return
      }
    };
    this.proto = async message => {
      console.log({message});
      const proto = this.protos[message.protocol || message.type];
      if (!proto) return console.warn('unimplemented protocol: ' + message.protocol);
      return await proto(message)
      
    };
    return this._init();
  }
  
  isDomain(address) {
    if (ip.toLong(address) === 0) return true;
    return false;
  }
  
  async connect({peerId, port, address, protocol}) {
    if (this.isDomain(address) && !port) port = 8080;
    const client = await connection({port, address, protocol, peerId, wss});
    console.log('connected', client);
    return {client, peerId, protocol}
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
    for (const { peerId, client, protocol } of await this.allSettled(all)) {
      if (peerId) {
        if (client.client.readyState !== 3) {
          this.addClient({peerId, protocol, client});
          let star = this.config.discovery.star;
          if (!star) star = { protocol: 'disco-room', port: 8080 };
          const addressBook = [this.config.api, this.config.gateway, star];
          const addresses = await client.request({url: 'join', params: { peerId: this.config.identity.peerId, addressBook } });
          console.log({addresses});
          addresses.push([
            'star.leofcoin.org/5000/disco-room/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp',
            'star.leofcoin.org/4000/leofcoin-api/3tr3E5MNvjNR6fFrdzYnThaG3fs6bPYwTaxPoQAxbji2bqXR1sGyxpcp73ivpaZifiCHTJag8hw5Ht99tkV3ixJDsBCDsNMiDVp'
          ]);
          for (const addressBook of addresses) {
            const {peerId} = this.parseAddress(addressBook[0]);
            try {
              const address = addressBook.reduce((p, c) => {
                const { protocol, port, address } = this.parseAddress(c);
                if (protocol === this.config.discovery.star.protocol) return { protocol, port, address };
                return p;
              }, null);
              if (address) {
                await this.dialPeer(peerId, address);
                console.log('dial success');
                this.peerMap.set(peerId, addressBook);  
              }
              
            } catch (e) {
                console.warn({e, 'error': true});      
            }  
          }
          client.on('error', this._onError);
          client.on('join', this._onJoin);
          client.on('leave', this._onLeave);
          client.on('route', this._onRoute); 
        }  
      }
      return this
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
      for (const [peerId, clients] of this.clientMap.entries()) {
        const client = clients[this.config.discovery.star.protocol];
        if (client) await client.request({url: 'leave', params: {peerId: this.config.identity.peerId} });
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
  
  async dial(_address) {
    console.log(_address);
    const { peerId, protocol, address, port } = this.parseAddress(_address);
    return this.dialPeer(peerId, {port, protocol, address})
  }
  
  async dialPeer(peerId, { port, protocol, address }, type) {
    console.log(port, address);
    if (this.isDomain(address) || typeof window === 'undefined') {
      if (!type) {
        const client = await connection({ port, protocol, address, wss, peerId });
        client.on('join', this._onJoin);
        client.on('leave', this._onLeave);
        
        this.addClient({peerId, protocol, client});
      }
      // TODO: get, set, ls      
    } else {
      if (!type) {
        for (const [peerId, clients] of this.clientMap.entries()) {
          const client = clients[this.config.discovery.star.protocol];
          if (client) client.send({ url: 'route', params: {peerId: this.peerId, from: this.peerId, to: peerId, protocol}});
        }
      }
      // TODO: get, set, ls
    }
    this.pubsub.publish('dial', peerId);
    return
  }
  
  addClient({peerId, protocol, client}) {
    let clients = {};
    if (this.clientMap.has(peerId)) clients = this.clientMap.get(peerId); 
    clients[protocol] = client;
    this.clientMap.set(peerId, clients);
  }
  
  async _onRoute(message) {
    console.log({message});
    
      return this.proto(message)
    
    
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
          console.log('dial success');
          this.peerMap.set(peerId, addressBook);  
        }
        
      } catch (e) {
        const {protocol, peerId, } = e;
        for (const [peerId, clients] of this.clientMap.entries()) {
          const client = clients[this.protocol];
          client.send({ url: 'route', params: {peerId: this.peerId, from: this.peerId, to: peerId, protocol}});
        }
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

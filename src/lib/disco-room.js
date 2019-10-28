'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var PeerInfo = _interopDefault(require('disco-peer-info'));
var connection = _interopDefault(require('socket-request-client'));
var PubSub = _interopDefault(require('little-pubsub'));
var ip = require('ip');
var Peer$1 = _interopDefault(require('simple-peer'));

const wss = typeof window !== 'undefined';

class DiscoBase {
  constructor(config = {}) {
    this.config = config;    
    this.pubsub = new PubSub();
    
    if (!this.config.discovery || !this.config.discovery.peers) throw new Error('expected config.discovery.peers to be defined')
    if (!this.config.identity || !this.config.identity.peerId) throw new Error('expected config.identity.peerId to be defined')
    this.protocols = ['disco-room'];
    // star clients
    this.clientMap = new Map();
    
    this.peerMap = new Map();
    
    this.peerInfo = new PeerInfo();
    this.peerInfo.fromDecoded({
      protocols: this.protocols,
      peerId: this.peerId,
      address: '127.0.0.1'
    });
    this.peerInfo.encode();
    
    this._onJoin = this._onJoin.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onError = this._onError.bind(this);
    this._onRoute = this._onRoute.bind(this);
    this._onDial = this._onDial.bind(this);
  }  
  
  isDomain(address) {
    if (ip.toLong(address) === 0) return true;
    return false;
  }
  
  async connect({peerId, port, address, protocol}) {    
    if (this.isDomain(address) && !port) port = 8080;
    console.log('conn');
    const client = await connection({port, address, protocol, peerId, wss});
    console.log(client);
    return {client, peerId, protocol}
  }
  
  peerDiscovered(address) {
    this.pubsub.publish('peer:discoverd', address);
  }
  
  peerConnected(address) {
    this.pubsub.publish('peer:connected', address);
  }
  
  async connectStar(peerInfo) {
    if (typeof peerInfo === 'string') peerInfo = new PeerInfo().fromString(peerInfo);
    
    let {port, address, protocols, peerId} = peerInfo;
    const protoIndex = protocols.indexOf(this.config.discovery.star.protocol);
    const protocol = protocols[protoIndex];
    
    if (!port) port = 8080;
    
    const client = await connection({port, address, protocol, peerId, wss});
    client.on('error', this._onError);
    client.on('join', this._onJoin);
    client.on('leave', this._onLeave);
    client.on('route', this._onRoute); 
    client.on('dial', this._onDial); 
    this.clientMap.set(peerId, client);
    
    const addresses = await client.request({url: 'join', params: { peerId: this.config.identity.peerId } });
    for (const address of addresses) {
      const peerInfo = new PeerInfo();
      peerInfo.fromEncoded(Buffer.from(address, 'hex'));
      if (peerInfo.protocols[this.config.discovery.star.protocol]) {
        await this.connectStar(peerInfo);
      } else {
        this.peerDiscovered(peerInfo);
      }
      
    }
  }
  
  async _init() {
    for (const star of this.config.discovery.peers) {
      try {
        const peerInfo = new PeerInfo();
        peerInfo.fromString(star);
        const { port, address, protocols, peerId } = peerInfo.get();
        const protoIndex = protocols.indexOf(this.config.discovery.star.protocol);
        const protocol = protocols[protoIndex];
        
        const client = await connection({port, address, protocol, peerId, wss});
        this.clientMap.set(peerInfo.peerId, client);
      } catch (e) {
        this.pubsub.publish('error', e);
      }
    }
    for (const client of this.clientMap.values()) {
      if (client.client.readyState !== 3) {
        // fromDecoded({
        //   address: this.address
        // })
        const addresses = await client.request({url: 'join', params: { address: this.peerInfo.encoded.toString('hex') } });
        client.on('error', this._onError);
        client.on('join', this._onJoin);
        client.on('leave', this._onLeave);
        client.on('route', this._onRoute); 
        client.on('dial', this._onDial); 
        
        for (const address of addresses) {
          const peerInfo = new PeerInfo();
          peerInfo.fromEncoded(Buffer.from(address, 'hex'));
          if (peerInfo.protocols[this.config.discovery.star.protocol]) {
            await this.connectStar(peerInfo);
          } else {
            this.peerDiscovered(peerInfo);
          }
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
      await this.beforeExit();
      setTimeout(async () => {
        process.exit();
      }, 50);
    }); 
  }
  
  async beforeExit() {
    for (const [peerId, client] of this.clientMap.entries()) {
      const client = client[this.config.discovery.star.protocol];
      if (client) await client.request({url: 'leave', params: {peerId: this.config.identity.peerId} });
    }
  }
  
  async _onRoute(message) {
    console.log({message});
    
      return this.proto(message)
    
    
  }
  
  async _onJoin({ peerId, address }) {
    // TODO: add limit to config
    if (!this.peerMap.has(peerId) && this.peerMap.size < 125) {
      try {
        // await this.dial(peerId, address)
        const peerInfo = new PeerInfo();
        peerInfo.fromEncoded(Buffer.from(address, 'hex'));
        if (!this.peerMap.has(peerInfo.peerId)) this.peerDiscovered(peerInfo);
        // this.peerMap.set(peerId, address);
      } catch (e) {
        
      }      
      this.pubsub.publish('join', address);
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
    // console.error(error);
  }
}

const send = (peer, data) => {
  // if (!peer) throw 'Expected peer to be defined'
  peer.send(data);

};

const dial = async peer => await offer(peer);

const offer = peer => new Promise((resolve, reject) => {
  const onSignal = async data => {
    resolve(data);
  };
  peer.once('signal', onSignal);
});

const answer = (peer, data) => new Promise((resolve, reject) => {
  peer.once('connect', () => {
    console.log(`connected`);
    resolve();
  });

  peer.signal(data);
});

const close = async peer => peer.destroy();

var Peer = (peerInfo, signal) => {
  if (!globalThis.wrtc) globalThis.wrtc = require('wrtc');
  console.log({signal});
  const peer = new Peer$1({ initiator: signal ? false : true, wrtc: wrtc });
  // if (signal)
  return {
    send: data => send(peer, data),
    dial: () => dial(peer),
    answer: data => answer(peer, data),
    on: (event, cb) => peer.on(event, cb),
    once: (event, cb) => peer.once(event, cb),
    signal: signal => peer.signal(signal),
    close: () => close(peer)
  }

};

class DiscoRoom extends DiscoBase {
  get peers() {
    return this.peerMap.keys();
  }

  get protocol() {
    return this.config.discovery.star.protocol
  }

  get peerId() {
    return this.config.identity.peerId;
  }

  constructor(config = {}) {
    super(config);
    this.availablePeers = new Map();
    return this._init();
  }

  async _init() {
    await super._init();
    return this
  }

  async _onDial(params) {
    const peerInfo = new PeerInfo();
    peerInfo.fromEncoded(Buffer.from(params.from, 'hex'));
    console.log(params);
    if (!this.availablePeers.has(peerInfo.peerId)) this.availablePeers.set(peerInfo.peerId, peerInfo);
    if (params.to === this.peerInfo.encoded.toString('hex') && peerInfo.peerId !== this.peerInfo.peerId) {
      if (!globalThis.wrtc) globalThis.wrtc = require('wrtc');
      const peer = Peer(peerInfo, params.data);
      // const offer = await peer.dial()
      const keys = [...this.clientMap.keys()];
      const client = this.clientMap.get(keys[0]);
      // params.data = data
      params.to = params.from;
      params.from = this.peerId;
      // console.log(offer);
      // peer.once('connect', () => {
      //   console.log(`connected to ${from}`);
      //   this.peerMap.set(from, peer)
      // })
      console.log(this.availablePeers.entries());
      console.log(this.availablePeers.get(params.from));
      console.log(params.from);
      peer.once('signal', data => {
        console.log(data);
        params.data = data;
        peer.once('connect', () => {
          this.peerConnected(peerInfo, peer);
        });
        client.send({url: 'answer', params: params});
        
      });
      // await peer.answer(params.data)
      peer.signal(params.data);
    }
  }

  async que(entries) {
    const request = entries.shift();
    let data;
    try {
      data = await request;
      if (data) return data
    } catch (e) {
      if (entries.length === 0) return null
      return this.que(entries)
    }
    if (entries.length > 0) return this.que(entries)
  }


  dialRequest(from, to) {
    return new Promise(async (resolve, reject) => {
      if (!globalThis.wrtc) globalThis.wrtc = require('wrtc');
      const peer = Peer({ initiator: true, wrtc: wrtc });
      peer.on('error', error => reject(error));

      peer.once('connect', () => resolve({peerId: to, peer}));
      peer.once('signal', async data => {
        const values = this.clientMap.values();
        let success;
        for await (const client of values) {
          try {
            if (!success) {
              success = await new Promise((resolve, reject) => {
                client.on('answer', params => {
                  // this.peerMap.set(params.from, peer)
                  peer.signal(params.data);
                  resolve(true);
                });
                client.send({url: 'dial', params: { data, from, to }});
              });
            }

          } catch (e) {

          }
        }

      });


    });
  }

  async clientAnswer(client, data, from, to) {
    return new Promise((resolve, reject) => {
      client.on('answer', params => resolve(params));
      client.send({url: 'dial', params: { data, from, to }});
    });
  }


  async dial(info) {
    if (info.peerId === this.peerId) return;
    const peer = Peer();
    const offer = await peer.dial();
    const keys = [...this.clientMap.keys()];
    const client = this.clientMap.get(keys[0]);
// console.log(offer);
    // const data =
    if (!info.encoded) info.encode();
    const data = await this.clientAnswer(client, offer, this.peerInfo.encoded.toString('hex'), info.encoded.toString('hex'));
    console.log(data);
    await peer.answer(data.data);
    // const result = await this.dialRequest(this.peerId, info.peerId)
    console.log(`connected to ${info.peerId}`);
    this.peerConnected(info, peer);
    return {peer, peerId: info.peerId}
  }

  peerDiscovered(peerInfo) {
    console.log({peerDiscovered: peerInfo});
    if (this.peerId === peerInfo.peerId) return
    if (this.availablePeers.has(peerInfo.peerId)) return;
    this.availablePeers.set(peerInfo.peerId, peerInfo);
    console.log(peerInfo.peerId + ' discoverd');

    super.peerDiscovered(peerInfo);
    this.dial(peerInfo);
    // TODO: autoDial or nah
    if (this.autoDial) this.dial(info);
  }

  peerConnected(info, peer) {
    if (info.peerId) this.peerMap.set(info.peerId, peer);
    peer.on('data', data => {
      this.pubsub.publish('data', data);
    });
    super.peerConnected(info);
  }

  async beforeExit() {
    await super.beforeExit();
    for (const peer of this.peerMap.values()) {
      peer.send('leave');
    }
  }
}

module.exports = DiscoRoom;

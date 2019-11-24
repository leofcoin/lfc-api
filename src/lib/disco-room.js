'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var PeerInfo = _interopDefault(require('disco-peer-info'));
var connection = _interopDefault(require('socket-request-client'));
var DiscoBus = _interopDefault(require('@leofcoin/disco-bus'));
var ip = require('ip');
var fetch = _interopDefault(require('node-fetch'));
var Peer$1 = _interopDefault(require('simple-peer'));

const nodeDebug = process.env.debug || process.argv.indexOf('--verbose') !== -1;

const DEBUG = Boolean(typeof window !== undefined) ? nodeDebug : window.DEBUG;

const debug = text => {
  if (DEBUG) {
    const stack = new Error().stack;
    const caller = stack.split('\n')[2].trim();
    console.groupCollapsed(chalk.blue(text));
    console.log(caller);
    console.groupEnd();
  }
};

const lastFetched = {
  time: 0,
  address: undefined
};

const getAddress = async () => {
  let {address, time} = lastFetched;
  const now = Math.round(new Date().getTime() / 1000);
  if (now - time > 300) {
    address = await fetch('https://icanhazip.com/');
    address = await address.text();
    address = address.replace('\n', '');
    lastFetched.address = address;
    lastFetched.time = Math.round(new Date().getTime() / 1000);  
  }
  
  return address
};

const wss = typeof window !== 'undefined';

class DiscoBase extends DiscoBus {
  constructor(config = {}) {
    super();
    this.config = config;
    
    if (!this.config.discovery || !this.config.discovery.peers) throw new Error('expected config.discovery.peers to be defined')
    if (!this.config.identity || !this.config.identity.peerId) throw new Error('expected config.identity.peerId to be defined')
    this.protocols = ['disco-room'];
    // star clients
    this.clientMap = new Map();
    
    this.peerMap = new Map();
    
    this._onJoin = this._onJoin.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onError = this._onError.bind(this);
    this._onRoute = this._onRoute.bind(this);
    this._onDial = this._onDial.bind(this);
  }
  
  get peerId() {
    return this.config.identity.peerId
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
  
  peerDiscovered(info) {
    debug(`discovered: ${info.peerId}`);
    this.publish('peer:discoverd', info);
  }
  
  peerConnected(info) {
    debug(`connected: ${info.peerId}`);
    this.publish('peer:connected', info);
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
    
    const addresses = await client.request({url: 'join', params: { peerInfo: this.peerInfo.encoded.toString('hex') } });
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
    this.peerInfo = new PeerInfo();
    this.peerInfo.fromDecoded({
      protocols: this.protocols,
      peerId: this.peerId,
      address: await getAddress()
    });
    this.peerInfo.encode();
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
        this.publish('error', e);
      }
    }
    for (const client of this.clientMap.values()) {
      if (client.client.readyState !== 3) {
        // fromDecoded({
        //   address: this.address
        // })
        this.peerInfo.encode();
        const addresses = await client.request({url: 'join', params: { peerInfo: this.peerInfo.encoded.toString('hex') } });
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
      if (client) await client.request({url: 'leave', params: { peerInfo: this.peerInfo.encoded.toString('hex') } });
    }
  }
  
  async _onRoute(message) {
    console.log({message});
    
      return this.proto(message)
    
    
  }
  
  async _onJoin({ peerInfo }) {
    // TODO: add limit to config
    const info = new PeerInfo();
    info.fromEncoded(Buffer.from(peerInfo, 'hex'));
    if (!this.peerMap.has(info.peerId) && this.peerMap.size < 125) {
      try {
        // await this.dial(peerId, address)
        if (!this.peerMap.has(info.peerId)) this.peerDiscovered(info);
        // this.peerMap.set(peerId, address);
      } catch (e) {
        
      }      
      this.publish('peer:joined', info);
    }
  }
  
  _onLeave({ peerInfo }) {
    const info = new PeerInfo();
    info.fromEncoded(Buffer.from(peerInfo, 'hex'));
    if (this.peerMap.has(info.peerId)) {
      this.peerMap.delete(info.peerId);
      this.clientMap.delete(info.peerId);
      this.publish('peer:left', info);
    }
  }
  
  _onError(error) {
    if (this.subscribers) return this.publish('error', error)
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

const answer = (peer, data, timeout = 1000) => new Promise((resolve, reject) => {
  let resolved;
  
  peer.once('connect', () => {
    resolved = true;
    resolve();
  });
  setTimeout(() => {
    if (!resolved) reject();
  }, timeout);
  peer.signal(data);
});

const close = async peer => peer.destroy();

var Peer = ({peerInfo, signal, timeout = 1000, requestTimeOut = 5000}) => {
  if (!globalThis.wrtc) globalThis.wrtc = require('wrtc');
  const peer = new Peer$1({ initiator: signal ? false : true, wrtc: wrtc });
  // if (signal)
  return {
    send: data => send(peer, data),
    dial: () => dial(peer),
    answer: data => answer(peer, data, timeout),
    on: (event, cb) => peer.on(event, cb),
    once: (event, cb) => peer.once(event, cb),
    signal: signal => peer.signal(signal),
    request: (message) => new Promise((resolve, reject) => {
      let resolved;
      const messageInterface = message;
      const id = message.id || message.discoHash.toBs32();      
      if (message.signature) message.encode(message.signature);
      
      const once = message => {
        messageInterface._encoded = message;
        messageInterface.decode();
        if (messageInterface.id === id) {
          resolved = true;
          peer.removeListener('data', once);
          resolve(message);
        }
      };
      setTimeout( () => {
        if (!resolved) reject();
      }, requestTimeOut);
      
      peer.on('data', once);
      peer.send(message.encoded);
      
    }),
    removeListener: (event, cb) => peer.removeListener(event, cb),
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
    if (!this.availablePeers.has(peerInfo.peerId)) this.availablePeers.set(peerInfo.peerId, peerInfo);
    if (params.to === this.peerInfo.encoded.toString('hex') && peerInfo.peerId !== this.peerInfo.peerId) {
      if (!globalThis.wrtc) globalThis.wrtc = require('wrtc');
      const peer = Peer({ peerInfo, signal: params.data });
      // const offer = await peer.dial()
      const keys = [...this.clientMap.keys()];
      const client = this.clientMap.get(keys[0]);
      // params.data = data
      params.to = params.from;
      params.from = this.peerInfo.encoded.toString('hex');
      // console.log(offer);
      // peer.once('connect', () => {
      //   console.log(`connected to ${from}`);
      //   this.peerMap.set(from, peer)
      // })
      peer.once('signal', data => {
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

  async clientAnswer(client, data, from, to) {
    return new Promise((resolve, reject) => {
      client.on('answer', params => resolve(params));
      client.send({url: 'dial', params: { data, from, to }});
    });
  }


  async dial(info) {
    if (info.peerId === this.peerId) return;
    const peer = Peer({peerInfo: info, timeout: this.config.discovery.room.dialTimeout});
    const offer = await peer.dial();
    const keys = [...this.clientMap.keys()];
    const client = this.clientMap.get(keys[0]);
// console.log(offer);
    // const data =
    if (!info.encoded) info.encode();
    const data = await this.clientAnswer(client, offer, this.peerInfo.encoded.toString('hex'), info.encoded.toString('hex'));
    try {
      await peer.answer(data.data);
    } catch (e) {
      return this.dial(info)
    }
        // const result = await this.dialRequest(this.peerId, info.peerId)
    this.peerConnected(info, peer);
    return {peer, peerId: info.peerId}
  }

  peerDiscovered(peerInfo) {
    if (this.peerId === peerInfo.peerId) return
    if (this.availablePeers.has(peerInfo.peerId)) return;
    this.availablePeers.set(peerInfo.peerId, peerInfo);

    super.peerDiscovered(peerInfo);
    this.dial(peerInfo);
    // TODO: autoDial or nah
    if (this.autoDial) this.dial(peerInfo);
  }

  peerConnected(info, peer) {
    if (info.peerId) this.peerMap.set(info.peerId, peer);
    peer.on('data', data => {
      this.publish('data', data);
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

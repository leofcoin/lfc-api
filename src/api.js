import config from './api/config'
import account from './api/account'
import init from './api/init';
import peernet from './api/peernet';
import { expected, getAddress, debug, interfaceForCodecName } from './utils.js';
import DiscoRoom from 'disco-room';
import DiscoData from 'disco-data';
import DiscoDHTData from 'disco-dht-data';
import PeerInfo from 'disco-peer-info';
import DiscoBus from '@leofcoin/disco-bus';
import DiscoLink from './../node_modules/disco-folder/link';
import DiscoFolder from 'disco-folder';
import DiscoCodec from 'disco-codec';
import { join } from 'path';

export default class LeofcoinApi extends DiscoBus {
  get connectionMap() {
    console.log(this.discoRoom.connectionMap.entries());
    return this.discoRoom.connectionMap
  }
  get peerMap() {
    return this.discoRoom.peerMap
  }
  constructor(options = { config: {}, init: true, start: true }) {
    super()
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
    this.address = await getAddress()
    Object.defineProperty(this, 'peerId', {
      value: config.identity.peerId,
      writable: false
    })    
    
    this.discoRoom = await new DiscoRoom(config)
    
    
    this.peernet = new peernet(this.discoRoom, {
      'disco-dht': {
        has: async message => {
          try {
            const node = new DiscoDHTData()
            console.log(message.decoded.data);
            node._encoded = message.decoded.data
            node.decode()
            console.log(await globalThis.blocksStore.has(node.decoded.data.hash.toString()));
            const data = node.decoded.data
            console.log(node.decoded.data.hash);
              console.log(data.hash.toString());
            if (data.value) {
              console.log(data.value);
              const info = this.discoRoom.availablePeers.get(message.decoded.from)
              this.peernet.addProvider(info, data.hash.toString())
              return undefined
            } else {
              
              const has = await globalThis.blocksStore.has(node.decoded.data.hash.toString())
              console.log({has});
              node._decoded.data.value = has
              node.encode()
              return node.encoded
            }
          } catch (e) {
            console.error(e);
          }
          
          
        },
        in: () => {
          
        },
        out: () => {
          
        }
      },
      'lfc-block': {
        put: message => {
          const hash = message.discoHash.toString('hex');
          if (!globalThis.blocksStore.has(hash)) {
            globalThis.blocksStore.set(hash, message.encoded)
            debug(`Added block ${hash}`)
          }
          
        },
        get: message => {
          const hash = message.discoHash.toString('hex');
          if (globalThis.blocksStore.has(hash)) {
            return globalThis.blocksStore.get(hash)
          }
        }
      },
      'disco-data': {
        get: async message => {
          console.log('decode');
          const node = new DiscoData(message.decoded.data)
          node.decode()
          console.log(node);
          if (!node.response) {
            const data = await blocksStore.get(node.hash.toString())
            console.log(data);
            node.data = data.data ? Buffer.from(data.data) : data
            node.response = true
            console.log('encode');
            node.encode()
            console.log(node);
            return node.encoded
          } else {
            await this.put(node.hash.toString(), node.data.toString())
            return undefined
          }
          // return this.get(message.decoded)
        },
        put: message => {
          
        }
      }
    });
    
    
  
    return
      // this.dht = new SimpleDHT(this.peernet)
  }
  
  routedRequest(connection, message, response) {
      const messageId = uuid();
      
      const data = JSON.stringify({
        url: 'route',
        status: 200,
        value: message,
        id: messageId,
        customMessage: true
      });
      
      const onmessage = message => {
        console.log({message});
        let data;
        if (message.type) {
          switch (message.type) {
            case 'binary':
              data = message.binaryData.toString();
              break;
            case 'utf8':
              data = message.utf8Data;
              break;
          }
        }
        const { route, params, url, id } = JSON.parse(data);          
        if (id === messageId) {
          response.send(data)
          connection.removeListener('message', onmessage)
        }
      }
      connection.on('message', onmessage)
      connection.send(data)
    }
    
    /**
     * Route data between nodes who can't connect to each other.
     */
    async _onRoute(message, response) {
      console.log({message});
      if (message.to && this.connectionMap.has(message.to)) {
        const { addressBook, connection } = this.connectionMap.get(message.to)
        const address = addressBook.reduce((c, p) => {
          const {protocol} = parseAddress(c)
          if (protocol === message.protocol) return c;
          return p;
        }, null)
        if (address) await this.discoRoom.dialPeer(address)
        // if (!Array.isArray(message.from)) message.from = [message.from]      
        // message.from = [...message.from, this.peerId]
        this.routedRequest(connection, message, response)
      } else if (!this.connectionMap.has(message.to)) {
        message.from = this.peerId;
        for (const [peerId, {connection}] of this.connectionMap.entries()) {        
          message.to = peerId;
          this.routedRequest(connection, message, response) 
        }
      } else {
        console.warn('unimplemented behavior');
        // TODO: search for peer
      }
      
      
    }
  
  _onhas(params, response) {
    console.log(params);
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
      data = await blocksStore.get(hash)
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
    let data;
    if (!hash) throw expected(['hash: String'], { hash })
    try {
      data = await globalThis.blocksStore.get(hash)
      const codec = new DiscoCodec()
      codec.fromBs58(data)
      if (codec.name === 'disco-folder') {
        const folder = new DiscoFolder()
        folder.fromBs58(data)
        return folder.encoded
      }
    } catch (e) {
      if (!data) {
        const providers = await this.peernet.providersFor(hash)
        console.log({providers});
        data = await this.peernet.get(hash)
        console.log({data});
        const codec = new DiscoCodec()
        codec.fromBs58(data)
        if (codec.name === 'disco-folder') {
          const folder = new DiscoFolder()
          folder.fromBs58(data)
          return folder.encoded
        }
        if (data) return data;
        // blocksStore.put(hash, data)
        if (providers && providers.length > 0) {
          data = this.peernet.get(hash)
          await blocksStore.put(hash, data)
          const codec = new DiscoCodec()
          codec.fromBs58(data)
          if (codec.name === 'disco-folder') {
            const folder = new DiscoFolder()
            folder.fromBs58(data)
            return folder.encoded
          }
        }
        
      }  
    }
    
    
    return data
  }
  
  async put(hash, data) {
    if (!hash || !data) throw expected(['hash: String', 'data: Object', 'data: String', 'data: Number', 'data: Boolean'], { hash, data })
    return await blocksStore.put(hash, data)
  }
  
  async rm(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blocksStore.delete(hash)
  }
  
  async ls(hash) {
    if (!hash) throw expected(['hash: String'], { hash })
    return await blocksStore.ls(hash)
  }
  
  async _addFolder(folder, links) {
    const input = document.createElement('input')
    input.webkitdirectory = true
    input.directory = true
    input.multiple = true
    input.type = 'file';
    const change = new Promise((resolve, reject) => {
      input.onchange = async () => {
        const jobs = []
        let size = 0;
        let name;
        for (const file of input.files) {
          size += file.size
          if (!name) {
            name = file.webkitRelativePath.match(/^(\w*)/g)[0]
          }
          jobs.push(new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = ({target}) => resolve({name: file.name, data: Buffer.from(target.result)});
            reader.readAsText(file)
          }))
        }
        const result = await Promise.all(jobs)
        const _links = []
        console.log({result});
        for await (const { name, data } of result) {
          // await api.put()
          console.log(data);
          const link = new DiscoLink()
          link.create({name, data})
          link.encode()
          const hash = link.discoHash.toBs58()
          await this.put(hash, data)
          _links.push({name, hash})
        }
        const discoFolder = new DiscoFolder()
        discoFolder.create({name, links: _links})
        discoFolder.encode()
        const folderHash = discoFolder.discoHash.toBs58()
        await this.put(folderHash, discoFolder.toBs58())
        // console.log(result);
        resolve(folderHash)
      }
    });
    document.head.appendChild(input)
    input.click()
    return await change
    // await this.put(folderHash, _links)
    // return folderHash
  }
  
  async addFolder(folder, links) {
    if (typeof window !== 'undefined') {
      return await this._addFolder(folder, links)
    }
    const fs = require('fs')
    const { promisify } = require('util')
    const readdir = promisify(fs.readdir)
    const readFile = promisify(fs.readFile)
    const files = await readdir(folder)
    const _links = []
    for await (const path of files) {
      const data = await readFile(join(folder, path))
      const discoLink = new DiscoLink()
      discoLink.create({name: path, data})
      _links.push({name: path, hash: discoLink.discoHash.toBs58()})
    }
    const discoFolder = new DiscoFolder()
    discoFolder.create({name: folder, links: _links})
    discoFolder.encode();
    const folderHash = discoFolder.discoHash.toBs58()
    await this.put(folderHash, discoFolder.toBs58())
    return folderHash
  }
}

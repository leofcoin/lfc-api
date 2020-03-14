import PubsubRequest from './lib/network/pubsub-request.js'
import { LFCTx } from 'ipld-lfc-tx'
import { LFCNode } from 'ipld-lfc'
import { longestChain } from './lib/dagchain/dagchain-interface';
import { localDAGMultiaddress } from './params'
import { log } from './utils'

globalThis.leofcoin = globalThis.leofcoin || {}

// const sync = async () => {
//   try {
//     const { hash } = await longestChain();
//     leofcoin.currentBlockHash = hash || await localDAGMultiaddress();
//     leofcoin.currentBlockNode = await leofcoin.block.dag.get(leofcoin.currentBlockHash)
//     log(`current block hash : ${leofcoin.currentBlockHash}`);
//     log(`chain size: ${Math.round(Number(leofcoin.currentBlockNode.size) * 1e-6 * 100) / 100} Mb (${leofcoin.currentBlockNode.size} bytes)`);
//     return leofcoin.currentBlockHash
//   } catch (e) {
//     throw e
//   }
// }

export default class GlobalScope {
  constructor(params, api) {
    return this._init(params)
  }
  
  async _init({ipfs, peerId, discoServer}) {
    globalThis.pubsubRequest = await new PubsubRequest({ipfs, peerId}, this.api)
    globalThis.peerId = peerId
    globalThis.ipfs = ipfs
    globalThis.getTx = async multihash => ipfs.dag.get(multihash, { format: LFCTx.codec, hashAlg: LFCTx.defaultHashAlg, vesion: 1, baseFormat: 'base58btc' })
    globalThis.leofcoin.peers = discoServer.connections
    globalThis.leofcoin.block = {
      get: async multihash => {
        const node = await leofcoin.block.dag.get(multihash)
        return node.toJSON()
      },
      dag: {
        get: async multihash => {
          const {value} = await ipfs.dag.get(multihash, { format: LFCNode.codec, hashAlg: LFCNode.defaultHashAlg, vesion: 1, baseFormat: 'base58btc' })
          return new LFCNode(value)
        }
      }
    }
    globalThis.leofcoin.transaction = {
      get: async multihash => {
        const node = await leofcoin.transaction.dag.get(multihash)
        return node.toJSON()
      },
      dag: {
        get: async multihash => {
          const {value} = await ipfs.dag.get(multihash, { format: LFCTx.codec, hashAlg: LFCTx.defaultHashAlg, vesion: 1, baseFormat: 'base58btc' })
          return new LFCTx(value)
        }
      }
    }
    globalThis.leofcoin.hashMap = new Map()
    globalThis.leofcoin.chain = {
      get: async hash => {
        if (!hash) {
          const blocks = []
          for (const [index, multihash] of leofcoin.hashMap.entries()) {
            const block = await leofcoin.block.dag.get(multihash)
            const _transactions = []
            for (const {multihash} of block.transactions) {
              const transaction = await leofcoin.transaction.get(multihash)
              _transactions.push(transaction)
            }
            block.transactions = _transactions
            blocks[index] = block
          }
          return blocks
        }
        if (!isNaN(hash)) hash = await leofcoin.hashMap.get(hash)
        return leofcoin.block.get(hash)
      },
      dag: {
        get: async hash => {
          if (!hash) {
            const blocks = []
            for (const [index, multihash] of leofcoin.hashMap.entries()) {
              const block = await leofcoin.block.dag.get(multihash)
              blocks[index] = block
            }
            return blocks
          }
          if (!isNaN(hash)) hash = await leofcoin.hashMap.get(hash)
          
          return leofcoin.block.dag.get(hash)
        }
      }
    }
  }
    
  get api() {
    return {
      chainHeight: () => (globalThis.chain.length - 1),
      blockHash: ({value}) => {
        return globalThis.chain[value].hash
      },
      lastBlock: () => {
        const index = (globalThis.chain.length - 1)
        return globalThis.chain[index]
      } 
    }    
  }
}

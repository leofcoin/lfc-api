'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Koa = _interopDefault(require('koa'));
var Router = _interopDefault(require('@koa/router'));
var IPLDLFCTx = require('ipld-lfc-tx');
var IPLDLFCTx__default = _interopDefault(IPLDLFCTx);
var joi = require('@hapi/joi');
var ipldLfc = _interopDefault(require('ipld-lfc'));
var CID = _interopDefault(require('cids'));
var crypto = require('crypto');
var MultiWallet = _interopDefault(require('@leofcoin/multi-wallet'));
var fs = require('fs');
var util$2 = require('util');
require('path');
var bodyParser = _interopDefault(require('koa-bodyparser'));
var cors = _interopDefault(require('@koa/cors'));

const reward = 150;
const consensusSubsidyInterval = 52500;
const genesisCID = 'zsNS6wZiHSc2QPHmjV8TMNn798b4Kp9jpjsBNeUkPhaJTza3GosWUgE72Jy3X9jKMrFCcDni7Pq4yXogQN4TcAfrPmTXFt';
const GENESISBLOCK = {
	index: 0,
  prevHash: Buffer.alloc(47).toString('hex'),
  time: 1590240964,
  transactions: [],
  nonce: 1077701
};

/**
 * network (hardcoded for now)
 * @dev change to 'leofcoin:olivia' for testnet
 */
const network = 'leofcoin';

// TODO: show notification
/**
 * @example
 * const errors = new Errors()
 */
class Errors {
  BlockError(text) {
  }
  
  TransactionError(text) {
  }
  
  MinerWarning(text) {
  }
}

/**
 * @extends {Errors}
 * @example
 * const validator = new Validator()
 */
class Validate extends Errors {
	constructor() {
		super();
		
		const block = joi.object().keys({
			index: joi.number(),
			prevHash: joi.string().length(94),
			time: joi.number(),
			transactions: joi.array().items(joi.object().keys({
				multihash: joi.string(),
				size: joi.number()
			})),
			nonce: joi.number(),
			hash: joi.string().length(128)
		});
		
		const transaction = joi.object().keys({
			id: joi.string().hex().length(64),
			time: joi.number(),
			reward: joi.string(),
			script: joi.string(),
			inputs: joi.array().items(joi.object().keys({
				tx: joi.string().hex().length(64),
				index: joi.number(),
				amount: joi.number(),
				address: joi.string(),
				signature: joi.string().hex()
			})),
			outputs: joi.array().items(joi.object().keys({
				index: joi.number(),
				amount: joi.number(),
				address: joi.string()
			})),
		});
		
		this.schemas = {
			block,
			transaction,
		};
	}
		
	validate(schema, data) {
		this.schemas[schema].validate(data);
	}
	
	isValid(schema, data) {
		return Boolean(!this.validate(schema, data).error)
	};
}

const { LFCNode, util } = ipldLfc;

/**
 * @extends {Validator}
 * @example
 * const hash = new Hash()
 */
class Hash extends Validate {
	constructor() {
		super();
	}
	
	hashFromMultihash(multihash) {
	  const cid = new CID(multihash.replace('/ipfs/', ''));
	  return cid.multihash.slice(cid.prefix.length / 2).toString('hex')
	}
	
	multihashFromHash(hash) {
	  const cid = new CID(1, 'leofcoin-block', Buffer.from(`1d40${hash}`, 'hex'), 'base58btc');
	  return cid.toBaseEncodedString();
	}
	
	async blockHash(block) {		
	  block = await new LFCNode({...block});
	  const cid = await util.cid(await block.serialize());
	  return this.hashFromMultihash(cid.toBaseEncodedString());
	}
	
	/**
	 * Generate transaction hash
	 *
	 * @param {object} transaction {id, type, inputs, outputs}
	 */
	async transactionHash(transaction) {
		const tx = new IPLDLFCTx__default.LFCTx(transaction);
		const cid = await IPLDLFCTx__default.util.cid(tx.serialize());
		return cid.toBaseEncodedString()
	}

	/**
	 * Generate transaction input hash
	 *
	 * @param {object} transactionInput {transaction, index, amount, address}
	 */
	transactionInputHash(transactionInput) {
		const {tx, index, amount, address} = transactionInput;
		return _SHA256({tx, index, amount, address});
	}

}

const { LFCTx, util: util$1 } = IPLDLFCTx;

/**
 * @extends {Hash}
 * @example
 * const transaction = new Transaction()
 */
class Transaction extends Hash {
  constructor() {
    super();
  }
  
  
  /**
   * Create transaction
   *
   * @param inputs
   * @param outputs
   * @param reward
   * @return {{id: string, reward: boolean, inputs: *, outputs: *, hash: string}}
   */
  async newTransaction(inputs, outputs, reward = null) {
    try {
      const tx = new LFCTx({
        id: crypto.randomBytes(32).toString('hex'),
        time: Math.floor(new Date().getTime() / 1000),
        reward,
        outputs,
        inputs
      });
      // const cid = await util.cid(tx.serialize())
      // await global.ipfs.dag.put(tx, {format: util.codec, hashAlg: util.defaultHashAlg, version: 1, baseFormat: 'base58btc'})
      return tx
    } catch (e) {
      throw e
    }
  }
  
  /**
   * Create reward transaction for block mining
   *
   * @param {string} address
   * @param {number} height
   * @return {id: string, reward: boolean, inputs: *, outputs: *, hash: string}
   */
  async createRewardTransaction(address, amount) {
    return this.newTransaction([], [{index: 0, amount, address}], 'mined');
  }
  
  /**
   * validate transaction
   *
   * @param multihash
   * @param transaction
   * @param unspent
   */
  async validateTransaction(multihash, transaction, unspent) {
  	if (!transaction.reward) delete transaction.reward;
  	const outputs = transaction.outputs.map(o => {
  		// TODO: fix script
  		if (!o.script) delete o.script;
  		return o
  	});
  	transaction.outputs = outputs;
  	if (!transaction.script) delete transaction.script;
  	if (!isValid('transaction', transaction)) throw this.TransactionError('Invalid transaction');
  	if (multihash !== await this.transactionHash(transaction)) throw this.TransactionError('Invalid transaction hash');
  	// TODO: versions should be handled here...
  	// Verify each input signature
  	
  	if (transaction.inputs) {
  		transaction.inputs.forEach(input => {
  	  	const { signature, address } = input;
  			const hash = this.transactionInputHash(input);
  
  	  	let wallet = new MultiWallet(network);
  	    wallet.fromAddress(address, null, network);
  			
  			if (!wallet.verify(Buffer.from(signature, 'hex'), Buffer.from(hash, 'hex')))
  				throw this.TransactionError('Invalid input signature');
  		});
  	
  		// Check if inputs are in unspent list
  		transaction.inputs.forEach((input) => {
  			if (!unspent.find(out => out.tx === input.tx && out.index === input.index)) { throw this.TransactionError('Input has been already spent: ' + input.tx); }
  		});	
  	}
  	
  	if (transaction.reward === 'mined') {
  		// For reward transaction: check if reward output is correct
  		if (transaction.outputs.length !== 1) throw this.TransactionError('Reward transaction must have exactly one output');
  		if (transaction.outputs[0].amount !== reward) throw this.TransactionError(`Mining reward must be exactly: ${reward}`);
  	} else if (transaction.inputs) {
  		// For normal transaction: check if total output amount equals input amount
  		if (transaction.inputs.reduce((acc, input) => acc + input.amount, 0) !==
        transaction.outputs.reduce((acc, output) => acc + output.amount, 0)) { throw this.TransactionError('Input and output amounts do not match'); }
  	}
  
  	return true;
  }
  
  /**
   * validate transactions list for current block
   *
   * @param {array} transactions
   * @param unspent
   */
  async validateTransactions(transactions, unspent) {
  	const _transactions = [];
  	for (const {multihash} of transactions) {
  		const tx = await leofcoin.api.transaction.dag.get(multihash);
  		_transactions.push({multihash, value: tx.toJSON()});
  		
  	}
  	for (const {value, multihash} of _transactions) {
  		// TODO: fix value.scrip
  		await this.validateTransaction(multihash, value, unspent);
  	}
  	
  	if (_transactions.filter(({value}) => value.reward === 'mined').length !== 1)
  		throw this.TransactionError('Transactions cannot have more than one reward')	
  }
  
  /**
   * Verify signature
   *
   * @param {string} address - signer address
   * @param {string} signature - signature to verify
   * @param {string} hash - transaction hash
   */
  verifySignature(address, signature, hash) {
  	const wallet = new MultiWallet(network);
  	return wallet.verify(signature, hash, address);
  }
  
  /**
   * Create and sign input
   *
   * @param transaction Based on transaction id
   * @param index Based on transaction output index
   * @param amount
   * @param wallet
   * @return {transaction, index, amount, address}
   */
  createInput(transaction, index, amount, wallet) {
  	const input = {
  		transaction,
  		index,
  		amount,
  		address: wallet.address,
  	};
  	input.signature = wallet.sign(Buffer.from(this.transactionInputHash(input), 'hex')).toString('hex');
  	return input;
  }
  
  /**
   * Create a transaction
   *
   * @param wallet
   * @param toAddress
   * @param amount
   * @return {id, reward, inputs, outputs, hash,}
   */
  async buildTransaction(wallet, toAddress, amount, unspent) {
  	let inputsAmount = 0;
  	// const unspent = await this.getUnspentForAddress(wallet.address);
  	const inputsRaw = unspent.filter(i => {
  		const more = inputsAmount < amount;
  		if (more) inputsAmount += i.amount;
  		return more;
  	});
  	if (inputsAmount < amount) throw this.TransactionError('Not enough funds');
  	// TODO: Add multiSigning
  	const inputs = inputsRaw.map(i => this.createInput(i.tx, i.index, i.amount, wallet));
  	// Send amount to destination address
  	const outputs = [{index: 0, amount, address: toAddress}];
  	// Send back change to my wallet
  	if (inputsAmount - amount > 0) {
  		outputs.push({index: 1, amount: inputsAmount - amount, address: wallet.address});
  	}
  	return this.newTransaction(inputs, outputs);
  }
}

const { LFCNode: LFCNode$1 } = ipldLfc;


/**
 * @extends {Transaction}
 * @example
 * const block = new Block()
 */
class Block extends Transaction {
  constructor() {
    super();
  }
  
  getDifficulty(hash) {
	   return parseInt(hash.substring(0, 8), 16);
  }
  
  goodBlock(block, difficulty){
    return new Promise(async (resolve, reject) => {
      block.hash = await this.blockHash(block);
      if (parseInt(block.hash.substring(0, 8), 16) >= difficulty) {
        block.nonce++;
        block = await this.goodBlock(block, difficulty);
      }      
      resolve(block);
    })
  }
  
  async validate(previousBlock, block, difficulty, unspent) {
  	if (!this.isValid('block', block)) throw this.BlockError('data');
  	// console.log(block, previousBlock);
  	if (previousBlock.index + 1 !== block.index) throw this.BlockError('index');
  	if (previousBlock.hash !== block.prevHash) throw this.BlockError('prevhash');
  	if (await this.blockHash(block) !== block.hash) throw this.BlockError('hash');
  	if (this.getDifficulty(block.hash) > difficulty) throw this.BlockError('difficulty');
  	return this.validateTransactions(block.transactions, unspent);
  }
  
  /**
   * Create a new genesis block
   */
  async newGenesisDAGNode(difficulty = 1, address = Buffer.alloc(32).toString('hex')) {
    let block = {
      index: 0,
      prevHash: Buffer.alloc(47).toString('hex'),
      time: Math.floor(new Date().getTime() / 1000),
      transactions: [
        // ms.unspent(network, [], wallet.account()).create(index: 0, amount: consensusSubsidy(0), address)
      ],
      nonce: 0
    };
    block.hash = await blockHash(block);
    block = await this.goodBlock(block, difficulty);
    console.log({block});
    const node = new LFCNode$1(block);
    return node;
  }
}

const invalidTransactions = {};

globalThis.chain = globalThis.chain || [
  GENESISBLOCK
];

globalThis.mempool = globalThis.mempool || [];
globalThis.blockHashSet = globalThis.blockHashSet || [];

const filterPeers = (peers, localPeer) => {
  const set = [];
  return peers.reduce((p, c) => {
    if (set.indexOf(c.peer) === -1 && c.peer !== localPeer) {
      set.push(c.peer);
      p.push(c);
    }
    return p
  }, [])
};

/**
 * @extends {Block}
 * @example
 * const chain = new Chain()
 */
class Chain extends Block {
  constructor() {
    super();
  }
  
  get chain() { return globalThis.chain }
  
  get mempool() { return globalThis.mempool }
  
  get blockHashSet() { return globalThis.blockHashSet }
  
  // TODO: needs 3 nodes running
  invalidTransaction(data) {
    // console.log(data.data.toString());
    data = JSON.parse(data.data.toString());
    if (!invalidTransactions[data.tx]) invalidTransactions[data.tx] = 0;
    ++invalidTransactions[data.tx];
    const count = invalidTransactions[data.tx];
    if (count === 3) {
      const memIndex = mempool.indexOf(data);
      mempool.splice(memIndex, 1);
      delete invalidTransactions[data.tx];
    }
  }
  
  /**
   * @param {number} height
   */
  consensusSubsidy(height) {
    console.log(height);
  	const quarterlings = height / consensusSubsidyInterval;
  	if (quarterlings >= 256) {
  		return 0;
  	}
  	//subsidy is lowered by 12.5 %, approx every year
  	const minus = quarterlings >= 1 ? (quarterlings * (reward / 256)) : 0;
  	return reward - minus;
  }
  
  async getTransactions(withMempool = true, index = 0) {
    const _chain = [...chain];
    if (index === chain.length - 1) return []
    _chain.slice(index + 1, chain.length - 1);
  	let transactions = _chain.reduce((transactions, block) => [ ...transactions, ...block.transactions], []);
  	if (withMempool) transactions = transactions.concat(mempool);
    let _transactions = [];
    // TODO: deprecated, get/put should be handled in core
    for (const tx of transactions) {
      const {multihash} = tx;
      if (multihash) {
        let value;
        if (leofcoin.api.transaction.dag) value = await leofcoin.api.transaction.dag.get(multihash);
        _transactions.push(value);
      } else {
        _transactions.push(tx);
      }
      
    }
    return _transactions
  };
  
  async getTransactionsForAddress(address, index = 0) {
    const transactions = await this.getTransactions(false, index);
  	return transactions.filter(tx => tx.inputs.find(i => i.address === address) ||
    tx.outputs.find(o => o.address === address));
  };
  
  /**
   * 
   * @param {string} withMempool - with or without mempool inclusion
   * @param {number} index - block height to start from
   */
  async getUnspent(withMempool = false, index = 0) {
  	const transactions = await this.getTransactions(withMempool, index);
  	// Find all inputs with their tx ids
  	const inputs = transactions.reduce((inputs, tx) => inputs.concat(tx.inputs), []);
  
  	// Find all outputs with their tx ids
  	const outputs = transactions.reduce((outputs, tx) =>
  		outputs.concat(tx.outputs.map(output => Object.assign({}, output, {tx: tx.id}))), []);
  
  	// Figure out which outputs are unspent
  	const unspent = outputs.filter(output =>
  		typeof inputs.find(input => input.tx === output.tx && input.index === output.index && input.amount === output.amount) === 'undefined');
  	return unspent;
  }
  
  /**
   * @param {string} address - wallet address
   * @param {number} index - block height to start from
   */
  async getUnspentForAddress(address = null, index = 0) {
    const unspent = await this.getUnspent(true, index);
  	return unspent.filter(u => u.address === address);
  }
  
  /**
   * @param {string} address - wallet address
   */
  async getBalanceForAddress(address = null, index) {
    // debug(`Getting balance for ${address}`)
    const unspent = await this.getUnspentForAddress(address, index);
    const amount = unspent.reduce((acc, u) => acc + u.amount , 0);
    // debug(`Got ${amount} for ${address}`)
  	return amount
  }
  
  /**
   * @deprecated Use getTransactionsForAddress(addr, index) instead
   *
   * @param {string} address - wallet address
   * @param {number} index - block height to start from
   * 
   * @return {number} balance
   */
  async getBalanceForAddressAfter(address = null, index = 0) {
    // debug(`Getting balance for ${address} @${index}`)
    const unspent = await this.getUnspentForAddress(address, index);
    const amount = unspent.reduce((acc, u) => acc + u.amount , 0);
    // debug(`Got ${amount} for ${address} @${index}`)
    return amount
  }
  
  median(array) {
    array.sort((a,b) => a - b);
  
    var half = Math.floor(array.length / 2);
  
    if(array.length % 2)
      return array[half];
    else
      return (array[half - 1] + array[half]) / 2.0;
  }
  
  difficulty() {
  	// TODO: lower difficulty when transactionpool contain more then 500 tx ?
  	// TODO: raise difficulty when pool is empty
  
    // or
  
    // TODO: implement iTX (instant transaction)
    // iTX is handled by multiple peers, itx is chained together by their hashes
    // by handlng a tx as itx the block well be converted into a iRootBlock
    // this results into smaller chains (tangles, tails) which should improve
    // resolving transactions, wallet amounts etc ...
  	const start = chain.length >= 128 ? (chain.length - 128) : 0;
  	const blocks = chain.slice(start, (chain.length - 1)).reverse();
  	const stamps = [];
  	for (var i = 0; i < blocks.length; i++) {
  		if (blocks[i + 1]) {
  			stamps.push(blocks[i].time - blocks[i + 1].time);
  		}
  	}
  	if (stamps.length === 0) {
  		stamps.push(10);
  	}
  	let blocksMedian = this.median(stamps) || 10;
    const offset = blocksMedian / 10;
     // offset for quick recovery
  	if (blocksMedian < 10) {
  		blocksMedian -= (offset / 2);
  	} else if (blocksMedian > 10) {
  		blocksMedian += (offset * 2);
  	}
    if (blocksMedian < 0) blocksMedian = -blocksMedian;
    console.log(`Average Block Time: ${blocksMedian}`);
    console.log(`Difficulty: ${10 / blocksMedian}`);
  	return (1000 / (10 / blocksMedian));
  };//10000
  
  
  /**
   * Get the transactions for the next Block
   *
   * @return {object} transactions
   */
  async nextBlockTransactions() {
  	const unspent = await this.getUnspent(false);
    console.log(unspent);
  	return mempool.filter(async (transaction) => {
      console.log(transaction);
      const multihash = transaction.multihash;
      const value = await leofcoin.api.transaction.get(multihash);
      console.log({value});
  		try {
  			await this.validateTransaction(multihash, value, unspent);
        return transaction
  		} catch (e) {
        globalThis.ipfs.pubsub.publish('invalid-transaction', Buffer.from(JSON.stringify(transaction)));
  			console.error(e);
  		}
  	});
  }  
  
  longestChain() {
    return new Promise(async (resolve, reject) => {
      try {
        let peers = await globalThis.ipfs.swarm.peers();
        peers = await filterPeers(peers, globalThis.peerId);
        
        const set = [];
        for (const {peer} of peers) {
          const chunks = [];
          try {
            for await (const chunk of ipfs.name.resolve(peer)) {
              chunks.push(chunk);
            }
          } catch (e) {
            console.warn(e);
          }
          if (chunks.length > 0) set.push({peer, path: chunks});
        }
        const _peers = [];
        let _blocks = [];
        for (const {peer, path} of set) {    
          if (_peers.indexOf(peer) === -1) {
            _peers.push(peer);
            const block = await leofcoin.api.block.dag.get(path[0] || path);      
            _blocks.push({block, path: path[0] || path});        
          }        
        }
        
        let localIndex;
        let localHash;
        try {
          localIndex = await chainStore.get('localIndex');
          localHash = await chainStore.get('localBlock');
        } catch (e) {
          localIndex = 0;
          localHash = genesisCID;
          await chainStore.put('localIndex', 0);
          await chainStore.put('localBlock', genesisCID);
        }
        const history = {};
        _blocks = _blocks.reduce((set, {block, path}) => {
          if (set.block.index < block.index) {
            history[set.block.index] = set;
            set.block.index = block.index;
            set.hash = path.replace('/ipfs/', '');
            set.seen = 1;
          } else if (set.block.index === block.index) {
            set.seen = Number(set.seen) + 1;
          }
          return set
        }, {block: { index: localIndex }, hash: localHash, seen: 0});
        // temp 
        // if (_blocks.seen < 2) {
        //   _blocks = history[_blocks.block.index - 1]
        // 
        // }
        // const localIndex = await chainStore.get('localIndex')
        // const localHash = await chainStore.get('localBlock')
        return resolve({index: _blocks.block.index, hash: _blocks.hash})
        
      } catch (e) {
        console.warn(e);
        // debug(e)
        reject(e);
      }
    })
  }
  
  lastBlock() {
    return new Promise(async (resolve, reject) => {
      const result = await this.longestChain();
      
      resolve(result); // retrieve links
    });
  }
  
  
  async nextBlock(address) {
    console.log(address);
    console.log({address});
    let transactions;
    let previousBlock;
    try {
      previousBlock = await this.lastBlock();
      
      if (previousBlock.index > chain.length - 1) {
        await leofcoin.api.chain.sync();
        previousBlock = await this.lastBlock();
      }
      if (!previousBlock.index) previousBlock = chain[chain.length - 1];
      transactions = await this.nextBlockTransactions();
    } catch (e) {
      previousBlock = GENESISBLOCK;
      previousBlock.hash = genesisCID;
      transactions = await this.nextBlockTransactions();
    } finally {
      // console.log(transactions, previousBlock, address);
      console.log({transactions});
      return await this.newBlock({transactions, previousBlock, address});
    }
  }  
  
  /**
  	 * Create new block
  	 *
  	 * @param {array} transactions
  	 * @param {object} previousBlock
  	 * @param {string} address
  	 * @return {index, prevHash, time, transactions, nonce}
  	 */
  async newBlock({transactions = [], previousBlock, address}) {
  	const index = previousBlock.index + 1;
  	const minedTx = await this.createRewardTransaction(address, this.consensusSubsidy(index));
  	transactions.push(minedTx.toJSON());
    console.log({transactions});
  	this.data = {
  		index,
  		prevHash: previousBlock.hash,
  		time: Math.floor(new Date().getTime() / 1000),
  		transactions,
  		nonce: 0
  	};
    console.log({data: this.data});
  	this.data.hash = await this.blockHash(this.data);
    console.log({hash: this.data.hash});
  	return this.data;
  }
}

const chain$1 = new Chain();

globalThis.bus = globalThis.bus || {};

globalThis.states = globalThis.states || {
  ready: false,
  syncing: false,
  connecting: false,
  mining: false
};

const getConfig = async () => await accountStore.get('config');

const setConfig = async data => await accountStore.put('config', data);

const setMinerConfig = async minerConfig => {
  const data = await getConfig();
  data.miner = minerConfig;
  await setConfig(data);
  return;
};

const getMinerConfig = async () => {
  const data = await getConfig();
  return data.miner;
};

const balance = chain$1.getBalanceForAddress.bind(chain$1);

const balanceAfter = chain$1.getBalanceForAddressAfter.bind(chain$1);

var version = "2.16.1";
var dependencies = {
	"@koa/cors": "^3.1.0",
	"@koa/router": "^9.3.1",
	"@leofcoin/daemon": "^1.0.15",
	"@leofcoin/disco-bus": "^1.0.4",
	"@leofcoin/lib": "^0.2.0",
	"@leofcoin/multi-wallet": "^2.0.0",
	"@leofcoin/storage": "^2.0.0",
	base32: "0.0.6",
	base58: "^2.0.1",
	ipfs: "^0.48.0",
	"ipfs-http-client": "^44.3.0",
	"ipld-lfc": "^0.1.4",
	"ipld-lfc-tx": "^0.3.3",
	"koa-bodyparser": "^4.3.0",
	"libp2p-kad-dht": "^0.19.9",
	"libp2p-pubsub": "^0.4.7",
	"little-pubsub": "^1.2.0",
	"node-fetch": "^2.6.0",
	"peer-id": "^0.13.13",
	"qr-scanner": "^1.2.0",
	qrcode: "^1.4.4"
};

const router = new Router();

const accounts = async (discoverDepth = 0) => {
  let wallet;
  let accounts = undefined;
  try {
    wallet = leofcoin.wallet;
    accounts = discoverAccounts(wallet, discoverDepth);
  } catch (e) {
    console.log('readied');
  }
  return accounts;
};

const _discoverAccounts = async (account, depth = 0) => {
  const accounts = [];
  const discover = async (account, depth) => {
    const external = account.external(depth);
    const internal = account.internal(depth);
    const tx = [];
    accounts.push(account);
    for (const { transactions } of globalThis.chain) {
      if (accounts[external.address] || accounts[internal.address]) return;
			for (let transaction of transactions) {
				const {multihash} = transaction;
				
				if (multihash) {
					transaction = await leofcoin.api.transaction.get(multihash);
				}
				if (tx[internal.address] || tx[external.address]) return;
				if (transaction.inputs) transaction.inputs.forEach((i) => {
					if (i.address === internal.address) return tx.push(internal.address);
					if (i.address === external.address) return tx.push(external.address);
				});
				if (transaction.outputs) transaction.outputs.forEach((o) => {
					if (o.address === internal.address) return tx.push(internal.address);
					if (o.address === external.address) return tx.push(external.address);
				});	
			}
    }
    // discover untill we find no transactions for given address
    if (tx.length > 0) return discover(account, depth + 1);
    return accounts;
  };

  return discover(account, 0);

};

/**
 * @param {object} root Instance of MultiWallet
 */
const discoverAccounts = async (root) => {
  let accounts = [];
  /**
   * @param {number} depth account depth
   */
  const discover = async depth => {
		
			debug('discovering accounts');
    const account = root.account(depth);
    const _accounts = await _discoverAccounts(account);
    accounts = [...accounts, _accounts];
		
		debug('done discovering accounts');
		if (_accounts.length > 1) return discover(depth + 1);
    return accounts;
  };

  return discover(0);

};

const accountNames = async () => await walletStore.get('accounts');

router.get('/api/version', ctx => {
  ctx.body = {client: '@leofcoin/api/http', version};
});

router.get('/api/account', async ctx => {
  ctx.body = JSON.stringify(await accountStore.get());
});

router.get('/api/wallet', async ctx => {
  ctx.body = await walletStore.get();
});

router.get('/api/config', async ctx => {
  if (ctx.request.query.miner) ctx.body = getMinerConfig();
  else ctx.body = await getConfig();
});

router.put('/api/config', async ctx => {
  setConfig(ctx.request.query.value);
});

router.put('/api/config/miner', async ctx => {
  console.log(ctx.request.query, ctx.request.query.intensity);
  if (ctx.request.query.intensity) setMinerConfig({intensity: ctx.request.query.intensity});
  // else api.setConfig(ctx.request.query.value)
});

router.get('/api/addresses', async ctx => {
  let _accounts = await accounts();
  const names = await accountNames();
  // TODO: allow account by name (even when there aren't any transactions...)
  // if (_accounts && _accounts.length < names.length) _account = [..._accounts, ...await accounts(names.length)]
  if (_accounts) return _accounts.map((account, i) => [or(names[i], i), _addresses(account, i)]);
  return undefined;
});

const readdir = util$2.promisify(fs.readdir);

const version$1 = dependencies.ipfs.replace('^', '');

const router$1 = new Router();

// router.use((ctx, next) => {
//   ctx.json = ctx.request.body
//   ctx.data = ctx.request.query.data
// 
//   next()
// })

router$1.get('/ipfs/version', ctx => {
  ctx.body = {client: '@leofcoin/ipfs/http', version: version$1};
});

router$1.put('/ipfs/addFromFs', async ctx => {
  if (!globalThis.globSource) {
    GLOBSOURCE_IMPORT;
  }
  const files = [];
  const glob = await globSource(ctx.request.query.data, {recursive: true});
  for await (const file of ipfs.add(glob)) {
    files.push(file);
  }
  ctx.set('content-type', 'application/json');
  ctx.body = files.map(file => {
    file.cid = file.cid.toString();
    return file
  });
  return 
});

router$1.get('/ipfs/block', async ctx => {
  const value = await ipfs.block.get(ctx.request.query.data);
  ctx.body = value;
});

router$1.put('/ipfs/block', async ctx => {
  const value = await ipfs.block.put(ctx.request.query.data);
  ctx.body = value;
});

router$1.get('/ipfs/key/list', async ctx => {
  const value = await ipfs.key.list();
  ctx.set('content-type', 'application/json');
  ctx.body = value;
});

router$1.get('/ipfs/key/gen', async ctx => {
  const value = await ipfs.key.gen(ctx.request.query.data);
  ctx.set('content-type', 'application/json');
  ctx.body = value;
});

router$1.put('/ipfs/pin/add', async ctx => {
  
  const value = await ipfs.pin.add(ctx.request.query.data);
  ctx.set('content-type', 'application/json');
  ctx.body = value;
});

router$1.put('/ipfs/dag', async ctx => {
  const { dag, format, hashAlg } = ctx.request.body;
  
  const value = await ipfs.dag.put(dag, {format, hashAlg});
  ctx.body = value;
  return
});

router$1.get('/ipfs/dag', async ctx => {
  const { path, format, hashAlg } = ctx.request.body;
  
  const value = await ipfs.dag.put(path, {format, hashAlg});
  ctx.body = value;
  return
});

router$1.get('/ipfs/dag/tree', async ctx => {
  const { path, hash } = ctx.request.body;
  ctx.body = await ipfs.dag.tree(hash, path);
});

router$1.get('/ipfs/name/resolve', async ctx => {
  const { hash } = ctx.request.body;
  ctx.body = await ipfs.name.resolve(hash);
});

router$1.put('/ipfs/name/publish', async ctx => {
  const { hash } = ctx.request.body;
  ctx.body = await ipfs.name.publish(hash);
});

var http = () => {
  const app = new Koa();
  
  app.use(cors());
  app.use(bodyParser());
  
  app.use(router.routes());
  app.use(router.allowedMethods());
  
  app.use(router$1.routes());
  app.use(router$1.allowedMethods());
    
  app.listen(5050, () => console.log('api listening on 5050'));
};

module.exports = http;

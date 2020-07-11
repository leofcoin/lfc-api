import * as ipldLfcTx from 'ipld-lfc-tx';
import Chain from './../node_modules/@leofcoin/lib/src/chain.js'

const { LFCTx, util } = ipldLfcTx 
const chain = new Chain()
const miners = [];

globalThis.bus = globalThis.bus || {}

globalThis.states = globalThis.states || {
  ready: false,
  syncing: false,
  connecting: false,
  mining: false
};
export const blockHashSet = globalThis.blockHashSet;
/**
* state - get current app state
*
* @param {string} key - event name
* @param {boolean|string} [wait=false|wait='event'] - wait untill next event when asked state is false
* or wait untill next event when set to 'event'
*/
export const state = (key, wait) => new Promise(async (resolve, reject) => {
  const state = await globalThis.states[key];
  if (wait && !state || wait && wait === 'event') bus.once(key, state => resolve(state));
  else resolve(state);
});

export const getConfig = async () => await accountStore.get('config');

export const setConfig = async data => await accountStore.put('config', data);

export const setMinerConfig = async minerConfig => {
  const data = await getConfig();
  data.miner = minerConfig;
  await setConfig(data);
  return;
}

export const getMinerConfig = async () => {
  const data = await getConfig();
  return data.miner;
}

export const mine = async config => {
  await state('ready', true)
  if (!config) {
    config = await accountStore.get('config')
    config = config.miner
  }
  let { address, intensity, donationAddress, donationAmount } = config;
  if (!intensity) intensity = 1;
  if (intensity && typeof intensity === 'string') intensity = Number(intensity);
  console.log({ address, intensity, donationAddress, donationAmount });
  if (donationAddress && donationAmount === 'undefined') donationAmount = 3; //procent
  const addMiner = count => {
    for (var i = 0; i < count; i++) {
      const miner = new Miner();
      miner.address = address;
      // miner.donationAddress = donationAddress;
      // miner.donationAmount = donationAmount;
      miner.start();
      miners.push(miner);
    }
  }
  if (globalThis.states.mining && miners.length === intensity) {
    miners.forEach(miner => miner.stop());
    globalThis.states.mining = false;
  } else if (!globalThis.states.mining && miners.length === intensity) {
    miners.forEach(miner => miner.start());
    globalThis.states.mining = true;
  } else {
    if (miners.length > 0 && miners.length === intensity) {
      miners.forEach(miner => {
        miner.address = address;
      });
    } else if (miners.length > intensity) {
      const removeCount = miners.length - intensity
      const removed = miners.slice(0, removeCount);
      removed.forEach(miner => miner.stop());
    } else if (miners.length < intensity && miners.length > 0) {
      const addCount = intensity - miners.length;
      addMiner(addCount);
    } else {
      addMiner(intensity);
    }
    globalThis.states.mining = true;
  }
  // TODO: add donationAddress
  // TODO: add donation option in ui
  // if (!address) address = donationAddress;

}

/**
 *
 * @param {string|number} height hash or height
 */
export const block = async (height) => {
  await state('ready', true)
  if (!height) return globalThis.chain[globalThis.chain.length - 1];
  if (typeof height !== 'string') return globalThis.chain[height]
  return globalThis.chain[blockHashSet[height]];
};

export const blocks = async (number, last) => {
  await state('ready', true)
  console.log(number, last);
  if (!number) return leofcoin.api.chain.get();
  else if (last) {
    return chain.slice((globalThis.chain.length - number), globalThis.chain.length);
  } else return block(number);
};

export const transactions = async (number, last) => {
  await state('ready', true)
  if (!number) return globalThis.chain[globalThis.chain.length - 1].transactions.map(tx => {
    tx.parentHash = globalThis.chain[globalThis.chain.length - 1].hash
    return tx;
  });
  let blocks;
  if (last) blocks = chain.slice((globalThis.chain.length - number), globalThis.chain.length);
  else blocks = chain.slice(0, number + 1);

  const tx = blocks.reduce((p, c) => [...p, ...c.transactions.map(tx => {
    tx.parentHash = c.hash;
    return tx;
  })], [])
  if (tx.length < number) {
    return transactions(number + 10, last)
  }
  if (last) return tx.slice((tx.length - number), tx.length)
  else return tx.slice(0, number)


};

export const importWallet = async (wif) => {
  // wallet = await generateWallet();
  // console.log(wallet.mnemonic);
  // const account = wallet.derive(`m/0\'/0/0`)
  // return { mnemonic: wallet.mnemonic, accounts: [account.address] }
}

const accounts = async (discoverDepth = 0) => {
  let wallet;
  let accounts = undefined;
  try {
    wallet = leofcoin.wallet;
    await state('ready', true);
    accounts = discoverAccounts(wallet, discoverDepth);
  } catch (e) {
    console.log('readied');
  }
  return accounts;
}

export const accountNames = async () => await walletStore.get('accounts')
// TODO: whenever a address is used update depth...
// IOW
// external(0).addr => internal(0).addr => external(1).addr => internal(1).addr ...
/**
 * @param {object} account - hdaccount
 * @param {number} depth - account depth
 * @return {array} [external, internal] - addresses
 */
const _addresses = ([account], depth = 0) => {
  // const external = account.external(0);
  // const external = account.external(0);
  // console.log([account.external(0), account.internal(0).address]);
  return [account.external(0).address, account.internal(0).address];
}

const addresses = async () => {
  let call = 0;
  let _accounts = await accounts();
  const names = await accountNames();
  // TODO: allow account by name (even when there aren't any transactions...)
  // if (_accounts && _accounts.length < names.length) _account = [..._accounts, ...await accounts(names.length)]
  if (_accounts) return _accounts.map((account, i) => [or(names[i], i), _addresses(account, i)]);
  return undefined;
}

export const send = async ({from, to, amount, message}, response) => {
  let value;
  try {
    // let wallet = leofcoin.wallet;
    // account ...
    let _accounts = await accounts();
    const names = await accountNames();
    // TODO: cleanup wallet internal/external...
    // something like accounts: [{ name, internal: [internal(0), internal(1), ...]}]
    value = await buildTransaction(_accounts[names.indexOf(from[1])][0].external(0), to, parseInt(amount))
    value = await leofcoin.api.transaction.dag.put(value)
    console.log({value});
    const tx = await leofcoin.api.transaction.get(value.multihash)
    // const cid = await util.cid(tx.serialize())
    // { multihash: cid.toBaseEncodedString(), size: tx.size};
    globalThis.ipfs.pubsub.publish('announce-transaction', JSON.stringify(value))
    
    tx.hash = hashFromMultihash(value.multihash)
    value = tx

  } catch (e) {
    throw e;
  }

  return value;
}

export const balance = chain.getBalanceForAddress.bind(chain);

export const balanceAfter = chain.getBalanceForAddressAfter.bind(chain);

const on = (ev, cb) => bus.on(ev, cb);

const emit = (ev, data) => bus.emit(ev, data);

export {on, emit, addresses, accounts}
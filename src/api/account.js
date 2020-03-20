import MultiWallet from 'multi-wallet';
import { DEFAULT_QR_OPTIONS } from './../constants.js';
import { expected } from './../utils.js';
import AES from 'crypto-js/aes.js';
import ENC from 'crypto-js/enc-utf8.js';
import QRCode from 'qrcode'
import QrScanner from './../../node_modules/qr-scanner/qr-scanner.min.js';
import { join } from 'path'
QrScanner.WORKER_PATH = join(__dirname, 'qr-scanner-worker.js');

const generateQR = async (input, options = {}) => {
  options = { ...DEFAULT_QR_OPTIONS, ...options };

  
  return QRCode.toDataURL(input, options);
}

const generateProfileQR = async (profile = {}, options = {}) => {
  if (!profile || !profile.mnemonic) throw expected(['mnemonic: String'], profile)
  profile = JSON.stringify(profile);
  return generateQR(profile, options);
}
//

const generateProfile = async () => {
  const wallet = new MultiWallet('leofcoin:olivia');
  const mnemonic = wallet.generate();
  const account = wallet.account(0)
  const external = account.external(0)
  return {
    mnemonic,
    publicKey: external.publicKey,
    privateKey: external.privateKey,
    walletId: external.id
  }
}


const importAccount = async (identity, password, qr = false) => {
  if (qr) {
    identity = await QrScanner.scanImage(identity)
    console.log({identity});
    identity = AES.decrypt(identity, password)
    console.log(identity.toString());
    identity = JSON.parse(identity.toString(ENC))
    if (identity.mnemonic) {
      const wallet = new MultiWallet('leofcoin:olivia');
      wallet.recover(identity.mnemonic)
      const account = wallet.account(0)
      const external = account.external(0)
      identity = {
        mnemonic: identity.mnemonic,
        publicKey: external.publicKey,
        privateKey: external.privateKey,
        walletId: external.id
      }
      let config = await configStore.get()
      config = { ...config, ...{ identity } }
      await configStore.put(config)
    }    
    return identity
    
    // return await generateQR(decrypted)
  }
  if (!identity) throw new Error('expected identity to be defined')
  if (identity.mnemonic) {
    const wallet = new MultiWallet('leofcoin:olivia');
    wallet.recover(identity.mnemonic)
    const account = wallet.account(0)
    const external = account.external(0)
    identity = {
      mnemonic: identity.mnemonic,
      publicKey: external.publicKey,
      privateKey: external.privateKey,
      walletId: external.id
    }
  }
  let config = await configStore.get()
  config = { ...config, ...{ identity } }
  await configStore.put(config)
  
  return identity
}

const exportAccount = async (password, qr = false) => {
  if (!password) throw expected(['password: String'], password)
  
  const identity = await configStore.get('identity')
  const account = await accountStore.get('public')
  
  if (!identity.mnemonic) throw expected(['mnemonic: String'], identity)
  
  const encrypted = AES.encrypt(JSON.stringify({ ...identity, ...account }), password).toString()
  if (!qr) return encrypted
  
  return await generateQR(encrypted)
}


export { 
  generateQR,
  generateProfileQR,
  generateProfile,
  importAccount,
  exportAccount  
}

export default { 
  generateQR,
  generateProfileQR,
  generateProfile,
  importAccount,
  exportAccount  
}
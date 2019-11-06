import MultiWallet from 'multi-wallet';
import { DEFAULT_QR_OPTIONS, DEFAULT_CONFIG } from './../constants.js';
import { expected } from './../utils.js';
import AES from 'crypto-js/aes.js';
import ENC from 'crypto-js/enc-utf8.js';

const generateQR = async (input, options = {}) => {
  options = { ...DEFAULT_QR_OPTIONS, ...options };

  QRCODE_IMPORT
  
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
    peerId: external.id
  }
}

const account = { 
  generateQR,
  generateProfileQR,
  generateProfile,
  import: async (identity, password) => {
    if (!identity) throw new Error('expected identity to be defined')
    if (identity.mnemonic) {
      const wallet = new MultiWallet('leofcoin:olivia');
      wallet.recover(identity.mnemonic)
      identity = {
        mnemonic: identity.mnemonic,
        publicKey: wallet.account(0).node.publicKey,
        privateKey: wallet.account(0).node.privateKey,
        peerId: wallet.id
      }
    }
    let config = await configStore.get()
    config = { ...DEFAULT_CONFIG, ...config, ...{ identity } }
    await configStore.put(config)
  },
  export: async password => {
    if (!password) throw expected(['password: String'], password)
    
    const identity = await configStore.get('identity')
    const account = await accountStore.get('public')
    
    if (!identity.mnemonic) throw expected(['mnemonic: String'], identity)
    
    const encrypted = AES.encrypt(JSON.stringify({ ...identity, ...account }), password).toString()
    return await generateQR(encrypted)
  }
}

export default account
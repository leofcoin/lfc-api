import {version} from './../package.json';

const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
}

const DEFAULT_CONFIG = {
  strap: [
    '/ip4/45.137.149.26/tcp/4002/ipfs/QmURywHMRjdyJsSXkAQyYNN5Z2JoTDTPPeRq3HHofUKuJ4'
  ],
  storage: {
    account: 'lfc-account',
    config: 'lfc-config',
  },
  version: '1.0.40-alpha.5'
}

export { DEFAULT_CONFIG, DEFAULT_QR_OPTIONS }

import Account from './api/account'
import DiscoBus from '@leofcoin/disco-bus';
import { expected, debug } from './utils.js';
import multicodec from 'multicodec';
import DHT from 'libp2p-kad-dht';
import MultiWallet from '@leofcoin/multi-wallet'
import fetch from 'node-fetch'


globalThis.leofcoin = globalThis.leofcoin || {}

let hasDaemon = false;
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

export default class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc', forceJS: false, star: false, network: 'leofcoin' }) {
    super()
    this.network = options.network || 'leofcoin'

    this.account = new Account(this.network)
    if (options.init) return this._init(options)
  }

  async hasDaemon() {
    try {
      let response = await fetch('http://127.0.0.1:5050/api/version')
      response = await response.json()
      return Boolean(response.client === '@leofcoin/api/http')
    } catch (e) {
      return false
    }
  }

  async environment() {
    const _navigator = globalThis.navigator
    if (!_navigator) {
      return 'node'
    } else if (_navigator && /electron/i.test(_navigator.userAgent)) {
      return 'electron'
    } else {
      return 'browser'
    }
  }

  async target() {
    let daemon = false
    const environment = await this.environment()
    if (!https) daemon = await this.hasDaemon()

    return { daemon, environment }
  }

  async _spawn(config = {}, forceJS = false, wallet = {}) {
    if (!config.target) config.target = await this.target()
    if (config.target.daemon && !forceJS) {
      let response = await fetch('http://127.0.0.1:5050/api/wallet', {})
      wallet = await response.json()
      GLOBSOURCE_IMPORT
      // TODO: give client its own package
      // HTTPCLIENT_IMPORT
      
      
      // const client = new HttpClient({ host: '127.0.0.1', port: 5050, pass: wallet.identity.privateKey});
      // globalThis.api = client.api
      // globalThis.ipfs = client.ipfs
      return
    } else {
      await STORAGE_IMPORT
      globalThis.accountStore = new LeofcoinStorage('lfc-account', `.leofcoin/${this.network}`)
      globalThis.chainStore = new LeofcoinStorage('lfc-chain', `.leofcoin/${this.network}`)
      globalThis.walletStore = new LeofcoinStorage('lfc-wallet', `.leofcoin/${this.network}`)
      const account = await accountStore.get()
      wallet = await walletStore.get()
      if (!wallet.identity) {
        const { identity, accounts, config } = await this.account.generateProfile()
        wallet.identity = identity
        wallet.accounts = accounts
        walletStore.put(wallet)
        await accountStore.put('config', config);
        await accountStore.put('public', { walletId: wallet.identity.walletId });
      }
      const multiWallet = new MultiWallet(this.network)
      multiWallet.import(wallet.identity.multiWIF)
      globalThis.leofcoin.wallet = multiWallet
      // if (config.target.environment === 'node' || config.target.environment === 'electron') {
      //   HTTP_IMPORT
      //   http()
      // }
      // HTTPCLIENT_IMPORT
      // const client = new HttpClient({ host: '127.0.0.1', port: 5050, pass: wallet.identity.privateKey});
      // globalThis.ipfs = client.ipfs
      // globalThis.api = client.api
      return await this.spawnJsNode(wallet, config.bootstrap, config.star, config.target)
    }
  }

  async _init({start, bootstrap, forceJS, star}) {
    await this._spawn({bootstrap, star}, forceJS)
    // await globalApi(this)
    return this
  }

  async spawnJsNode (config, bootstrap, star, { environment }) {
    await IPFS_IMPORT
      if (environment === 'node') {
        config.Addresses = {

        Swarm: [
          '/ip6/::/tcp/4020',
          '/ip4/0.0.0.0/tcp/4010',
          '/ip4/0.0.0.0/tcp/4030/ws'
        ],
        Gateway: '/ip4/0.0.0.0/tcp/8080',
        API: '/ip4/127.0.0.1/tcp/5001',
        Delegates: ['node0.preload.ipfs.io/tcp/443/https']

      }
      // if (star) config.Addresses.Swarm.push('/ip4/0.0.0.0/tcp/4030/ws');
      } else {
        config.Addresses = {
          Swarm: [],
          API: '',
          Gateway: '',
          Delegates: ['node0.delegate.ipfs.io/tcp/443/https']
        }
      }

    if (bootstrap === 'lfc') {
      if (environment === 'browser' && https || environment === 'electron') {
        bootstrap = [
         '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmbBM3idU5h5Gw73YoncGfjXJhzxveNvefpYwMbLAZWvk4'
       ]
     } else if (environment === 'node') {
        bootstrap = [
         '/dns4/star.leofcoin.org/tcp/4020/p2p/QmbBM3idU5h5Gw73YoncGfjXJhzxveNvefpYwMbLAZWvk4',
         '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmbBM3idU5h5Gw73YoncGfjXJhzxveNvefpYwMbLAZWvk4'
       ];
     } else {
       bootstrap = [
        '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmbBM3idU5h5Gw73YoncGfjXJhzxveNvefpYwMbLAZWvk4'
      ];
     }

    } else if (star) bootstrap = [];

    config = {
      pass: config.identity.privateKey,
      repo: walletStore.root,
      ipld: {
        async loadFormat (codec) {
          if (codec === multicodec.LEOFCOIN_BLOCK) {
            return import('ipld-lfc')
          } else if (codec === multicodec.LEOFCOIN_TX) {
            return import('ipld-lfc-tx')
          } else {
            throw new Error('unable to load format ' + multicodec.print[codec])
          }
        }
      },
      libp2p: {
        connectionManager: {
          minPeers: 5,
          maxPeers: 100,
          pollInterval: 5000
        },
        switch: {
          maxParallelDials: 10
        },
        modules: {
          // contentRouting: [
          //   new DelegatedContentRouter(peerInfo.id, delegatedApiOptions)
          // ],
          // peerRouting: [
          //   new DelegatedPeerRouter(delegatedApiOptions)
          // ],
          // dht: DHT
        },
        config: {
          relay: {
            enabled: true,
            hop: {
              enabled: true,
              active: true
            }
          },
          dht: {
            kBucketSize: 20,
            enabled: true,
            randomWalk: {
              enabled: true,            // Allows to disable discovery (enabled by default)
              interval: 10e3,
              timeout: 2e3
            }
          },
          pubsub: {
            enabled: true
          },
          webRTCStar: {
            enabled: true
          },

          peerDiscovery: {
            autoDial: false,
            websocketStar: {
              enabled: true
            }
          }
        }
      },
      config: {
        
        API: {
          "HTTPHeaders": {
            "Access-Control-Allow-Origin": [
              "http://localhost:5001",
              "*"
            ],
            "Access-Control-Allow-Methods": [
              "GET",
              "PUT",
              "POST"
            ]
          }
        },
        Bootstrap: bootstrap,
        Discovery: {
          MDNS: {
            Enabled: Boolean(!globalThis.navigator || /electron/i.test(navigator.userAgent)),
            Interval: 1000
          },
          webRTCStar: {
            Enabled: true
          },
          websocketStar: {
            enabled: true
          }
        },
        Swarm: {
          ConnMgr: {
            LowWater: 200,
            HighWater: 500
          }
        },
        Pubsub: {
          Enabled: true
        },
        Addresses: config.Addresses
      },
      relay: {
        enabled: true,
        hop: { enabled: true }
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    }

    try {
      console.log({config});
      globalThis.ipfs = await Ipfs.create(config)
      const { id, addresses, publicKey } = await ipfs.id()
      this.addresses = addresses
      this.peerId = id
      this.publicKey = publicKey

      const strap = await ipfs.config.get('Bootstrap')
      for (const addr of strap) {
        await ipfs.swarm.connect(addr)
      }
      
      GLOBSOURCE_IMPORT
      
      ipfs.addFromFs = async (path, recursive = false) => {
        console.log(await globSource(path, { recursive }));
        const files = []
        for await (const file of ipfs.add(globSource(path, { recursive }))) {
          files.push(file)
        }
        return files;
      }
    } catch (e) {
      console.error(e);
    }


  }


}

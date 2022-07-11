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
  constructor(options = { init: true, start: true, forceJS: false, star: false, network: 'leofcoin' }) {
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
      // HTTPCLIENT_IMPORT_disabled


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
      wallet = {
        accounts: JSON.parse(wallet.accounts.toString()),
        identity: JSON.parse(wallet.identity.toString()),
        version: wallet.version.toString(),
      }
      if (!wallet.identity) {
        const { identity, accounts, config } = await this.account.generateProfile()
        wallet.identity = identity
        wallet.accounts = accounts
        wallet.version = 1
        await walletStore.put('accounts', JSON.stringify(accounts))
        await walletStore.put('identity', JSON.stringify(identity))
        await walletStore.put('version', "1")

        await accountStore.put('config', JSON.stringify(config));
        await accountStore.put('public', JSON.stringify({ walletId: wallet.identity.walletId }));
      } else {
        // check if we are using correct accounts version
        // if arr[0] is not an array, it means old version
        if (!Array.isArray(wallet.accounts[0])) {
          wallet.accounts = [wallet.accounts]
          walletStore.put('accounts', JSON.stringify(wallet.accounts))
        }

        // ensure we don't need barbaric methods again.
        if (!wallet.version) walletStore.put('version', "1")
        // TODO: convert accounts[account] to objbased { name, addresses }
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
      return await this.spawnJsNode(wallet, config.star, config.target)
    }
  }

  async _init({start, forceJS, star}) {
    await this._spawn({ star}, forceJS)
    // await globalApi(this)
    return this
  }

  async spawnJsNode (config, star, { environment }) {
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

    // if (bootstrap === 'lfc') {
    //   if (environment === 'browser' && https || environment === 'electron') {
    //     bootstrap = [
    //      '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4'
    //    ]
    //  } else if (environment === 'node') {
    //     bootstrap = [
    //      '/dns4/star.leofcoin.org/tcp/4020/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4',
    //      '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4'
    //    ];
    //  } else {
    //    bootstrap = [
    //     '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4'
    //   ];
    //  }
    //
    // } else if (star) bootstrap = [];

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

        // API: {
        //   "HTTPHeaders": {
        //     "Access-Control-Allow-Origin": [
        //       "http://localhost:5001",
        //       "*"
        //     ],
        //     "Access-Control-Allow-Methods": [
        //       "GET",
        //       "PUT",
        //       "POST"
        //     ]
        //   }
        // },
        // Bootstrap: bootstrap,
        Discovery: {
          MDNS: {
            enabled: Boolean(!globalThis.navigator || /electron/i.test(navigator.userAgent)),
            interval: 1000
          },
          webRTCStar: {
            enabled: true
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
      globalThis.ipfs = await Ipfs.create(config)
      let version = await walletStore.get('version')
      version = version.toString()
      if (version !== 2 && star) {
        const earth = [
          // '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
          '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
          '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
          '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
          '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
          '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
          '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
          '/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
          '/dns4/node2.preload.ipfs.io/tcp/443/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
          '/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN',
          '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4'
        ]
        const strap = await ipfs.config.get('Bootstrap')
        await ipfs.config.set('Bootstrap', earth)

        walletStore.put('version', '2')
      }

      const { id, addresses, publicKey } = await ipfs.id()
      this.addresses = addresses
      this.peerId = id
      this.publicKey = publicKey

      if (!star) {
        const strap = await ipfs.config.get('Bootstrap')

        const index = strap.indexOf('/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4')
        if (index === -1) {
          strap.push('/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4')
          await ipfs.config.set('Bootstrap', strap)
          await ipfs.swarm.connect('/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmfShD2oP9b51eGPCNPHH3XC8K28VLXtgcR7fhpqJxNzH4')
        }

        for (const addr of strap) {
          // await ipfs.swarm.connect(addr)
        }
      }


      GLOBSOURCE_IMPORT

      ipfs.addFromFs = async (path, recursive = false) => {
        const files = []
        try {
          for await (const file of globalThis.ipfs.addAll(globSource(path, { recursive }))) {
            files.push(file)
          }
        } catch (e) {
          throw e
        }
        return files;
      }

    } catch (e) {
      console.error(e);
    }


  }


}

'use strict';

let Ipfs;
let LeofcoinStorage;

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

function _interopNamespace(e) {
  if (e && e.__esModule) { return e; } else {
    var n = {};
    if (e) {
      Object.keys(e).forEach(function (k) {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      });
    }
    n['default'] = e;
    return n;
  }
}

var MultiWallet = _interopDefault(require('multi-wallet'));
require('node-fetch');
var AES = _interopDefault(require('crypto-js/aes.js'));
var ENC = _interopDefault(require('crypto-js/enc-utf8.js'));
var QRCode = _interopDefault(require('qrcode'));
var path = require('path');
var DiscoBus = _interopDefault(require('@leofcoin/disco-bus'));
var multicodec = _interopDefault(require('multicodec'));
require('libp2p-kad-dht');

const DEFAULT_QR_OPTIONS = {
  scale: 5,
  margin: 0,
  errorCorrectionLevel: 'M',
  rendererOpts: {
    quality: 1
  }
};

const expected = (expected, actual) => {
  const entries = Object.entries(actual)
    .map(entry => entry.join(!entry[1] ? `: undefined - ${entry[1]} ` : `: ${typeof entry[1]} - `));

  return `\nExpected:\n\t${expected.join('\n\t')}\n\nactual:\n\t${entries.join('\n\t')}`;
};

class e{static hasCamera(){return navigator.mediaDevices.enumerateDevices().then((a)=>a.some((a)=>"videoinput"===a.kind)).catch(()=>!1)}constructor(a,c,b=e.DEFAULT_CANVAS_SIZE){this.$video=a;this.$canvas=document.createElement("canvas");this._onDecode=c;this._paused=this._active=!1;this.$canvas.width=b;this.$canvas.height=b;this._sourceRect={x:0,y:0,width:b,height:b};this._onCanPlay=this._onCanPlay.bind(this);this._onPlay=this._onPlay.bind(this);this._onVisibilityChange=this._onVisibilityChange.bind(this);
this.$video.addEventListener("canplay",this._onCanPlay);this.$video.addEventListener("play",this._onPlay);document.addEventListener("visibilitychange",this._onVisibilityChange);this._qrWorker=new Worker(e.WORKER_PATH);}destroy(){this.$video.removeEventListener("canplay",this._onCanPlay);this.$video.removeEventListener("play",this._onPlay);document.removeEventListener("visibilitychange",this._onVisibilityChange);this.stop();this._qrWorker.postMessage({type:"close"});}start(){if(this._active&&!this._paused)return Promise.resolve();
"https:"!==window.location.protocol&&console.warn("The camera stream is only accessible if the page is transferred via https.");this._active=!0;this._paused=!1;if(document.hidden)return Promise.resolve();clearTimeout(this._offTimeout);this._offTimeout=null;if(this.$video.srcObject)return this.$video.play(),Promise.resolve();let a="environment";return this._getCameraStream("environment",!0).catch(()=>{a="user";return this._getCameraStream()}).then((c)=>{this.$video.srcObject=c;this._setVideoMirror(a);}).catch((a)=>
{this._active=!1;throw a;})}stop(){this.pause();this._active=!1;}pause(){this._paused=!0;this._active&&(this.$video.pause(),this._offTimeout||(this._offTimeout=setTimeout(()=>{let a=this.$video.srcObject&&this.$video.srcObject.getTracks()[0];a&&(a.stop(),this._offTimeout=this.$video.srcObject=null);},300)));}static scanImage(a,c=null,b=null,d=null,f=!1,g=!1){let h=!1,l=new Promise((l,g)=>{b||(b=new Worker(e.WORKER_PATH),h=!0,b.postMessage({type:"inversionMode",data:"both"}));let n,m,k;m=(a)=>{"qrResult"===
a.data.type&&(b.removeEventListener("message",m),b.removeEventListener("error",k),clearTimeout(n),null!==a.data.data?l(a.data.data):g("QR code not found."));};k=(a)=>{b.removeEventListener("message",m);b.removeEventListener("error",k);clearTimeout(n);g("Scanner error: "+(a?a.message||a:"Unknown Error"));};b.addEventListener("message",m);b.addEventListener("error",k);n=setTimeout(()=>k("timeout"),3E3);e._loadImage(a).then((a)=>{a=e._getImageData(a,c,d,f);b.postMessage({type:"decode",data:a},[a.data.buffer]);}).catch(k);});
c&&g&&(l=l.catch(()=>e.scanImage(a,null,b,d,f)));return l=l.finally(()=>{h&&b.postMessage({type:"close"});})}setGrayscaleWeights(a,c,b,d=!0){this._qrWorker.postMessage({type:"grayscaleWeights",data:{red:a,green:c,blue:b,useIntegerApproximation:d}});}setInversionMode(a){this._qrWorker.postMessage({type:"inversionMode",data:a});}_onCanPlay(){this._updateSourceRect();this.$video.play();}_onPlay(){this._updateSourceRect();this._scanFrame();}_onVisibilityChange(){document.hidden?this.pause():this._active&&
this.start();}_updateSourceRect(){let a=Math.round(2/3*Math.min(this.$video.videoWidth,this.$video.videoHeight));this._sourceRect.width=this._sourceRect.height=a;this._sourceRect.x=(this.$video.videoWidth-a)/2;this._sourceRect.y=(this.$video.videoHeight-a)/2;}_scanFrame(){if(!this._active||this.$video.paused||this.$video.ended)return !1;requestAnimationFrame(()=>{e.scanImage(this.$video,this._sourceRect,this._qrWorker,this.$canvas,!0).then(this._onDecode,(a)=>{this._active&&"QR code not found."!==a&&
console.error(a);}).then(()=>this._scanFrame());});}_getCameraStream(a,c=!1){let b=[{width:{min:1024}},{width:{min:768}},{}];a&&(c&&(a={exact:a}),b.forEach((b)=>b.facingMode=a));return this._getMatchingCameraStream(b)}_getMatchingCameraStream(a){return 0===a.length?Promise.reject("Camera not found."):navigator.mediaDevices.getUserMedia({video:a.shift()}).catch(()=>this._getMatchingCameraStream(a))}_setVideoMirror(a){this.$video.style.transform="scaleX("+("user"===a?-1:1)+")";}static _getImageData(a,c=
null,b=null,d=!1){b=b||document.createElement("canvas");let f=c&&c.x?c.x:0,g=c&&c.y?c.y:0,h=c&&c.width?c.width:a.width||a.videoWidth;c=c&&c.height?c.height:a.height||a.videoHeight;d||b.width===h&&b.height===c||(b.width=h,b.height=c);d=b.getContext("2d",{alpha:!1});d.imageSmoothingEnabled=!1;d.drawImage(a,f,g,h,c,0,0,b.width,b.height);return d.getImageData(0,0,b.width,b.height)}static _loadImage(a){if(a instanceof HTMLCanvasElement||a instanceof HTMLVideoElement||window.ImageBitmap&&a instanceof window.ImageBitmap||
window.OffscreenCanvas&&a instanceof window.OffscreenCanvas)return Promise.resolve(a);if(a instanceof Image)return e._awaitImageLoad(a).then(()=>a);if(a instanceof File||a instanceof URL||"string"===typeof a){let c=new Image;c.src=a instanceof File?URL.createObjectURL(a):a;return e._awaitImageLoad(c).then(()=>{a instanceof File&&URL.revokeObjectURL(c.src);return c})}return Promise.reject("Unsupported image type.")}static _awaitImageLoad(a){return new Promise((c,b)=>{if(a.complete&&0!==a.naturalWidth)c();
else {let d,f;d=()=>{a.removeEventListener("load",d);a.removeEventListener("error",f);c();};f=()=>{a.removeEventListener("load",d);a.removeEventListener("error",f);b("Image load error");};a.addEventListener("load",d);a.addEventListener("error",f);}})}}e.DEFAULT_CANVAS_SIZE=400;e.WORKER_PATH="qr-scanner-worker.min.js";

e.WORKER_PATH = path.join(__dirname, 'qr-scanner-worker.js');

class LFCAccount {
  constructor(network) {
    this.network = network;
  }
  
  async generateQR(input, options = {}) {
    options = { ...DEFAULT_QR_OPTIONS, ...options };
  
    
    return QRCode.toDataURL(input, options);
  }
  
  async generateProfileQR(profile = {}, options = {}) {
    if (!profile || !profile.mnemonic) throw expected(['mnemonic: String'], profile)
    profile = JSON.stringify(profile);
    return this.generateQR(profile, options);
  }
  //
  
  /**
   * @return {object} { identity, accounts, config }
   */
  async generateProfile() {
    const wallet = new MultiWallet(this.network);
    /**
     * @type {string}
     */
    const mnemonic = wallet.generate();
    /**
     * @type {object}
     */
    const account = wallet.account(0);
    /**
     * @type {object}
     */
    const external = account.external(0);
    
    return {
      identity: {
        mnemonic,
        multiWIF: wallet.export(),
        publicKey: external.publicKey,
        privateKey: external.privateKey,
        walletId: external.id
      },
      accounts: ['main account', external.address],
      config: {
        miner: {
          intensity: 1,
          address: external.address,
          donationAddress: undefined,
          donationAmount: 1 //percent
        }
       }
    }
  }
  
  
  async importAccount(identity, password, qr = false) {
    if (qr) {
      identity = await e.scanImage(identity);
      console.log({identity});
      identity = AES.decrypt(identity, password);
      console.log(identity.toString());
      identity = JSON.parse(identity.toString(ENC));
      if (identity.mnemonic) {
        const wallet = new MultiWallet(this.network);
        wallet.recover(identity.mnemonic);
        const account = wallet.account(0);
        const external = account.external(0);
        identity = {
          mnemonic: identity.mnemonic,
          publicKey: external.publicKey,
          privateKey: external.privateKey,
          walletId: external.id
        };
        let config = await configStore.get();
        config = { ...config, ...{ identity } };
        await configStore.put(config);
      }    
      return identity
      
      // return await this.generateQR(decrypted)
    }
    if (!identity) throw new Error('expected identity to be defined')
    if (identity.mnemonic) {
      const wallet = new MultiWallet(this.network);
      wallet.recover(identity.mnemonic);
      const account = wallet.account(0);
      const external = account.external(0);
      identity = {
        mnemonic: identity.mnemonic,
        publicKey: external.publicKey,
        privateKey: external.privateKey,
        walletId: external.id
      };
    }
    let config = await configStore.get();
    config = { ...config, ...{ identity } };
    await configStore.put(config);
    
    return identity
  }
  
  async exportAccount(password, qr = false) {
    if (!password) throw expected(['password: String'], password)
    
    const identity = await configStore.get('identity');
    const account = await accountStore.get('public');
    
    if (!identity.mnemonic) throw expected(['mnemonic: String'], identity)
    
    const encrypted = AES.encrypt(JSON.stringify({ ...identity, ...account }), password).toString();
    if (!qr) return encrypted
    
    return await this.generateQR(encrypted)
  }

}

globalThis.leofcoin = globalThis.leofcoin || {};
const https = (() => {
  if (!globalThis.location) return false;
  return Boolean(globalThis.location.protocol === 'https:')
})();

class LeofcoinApi extends DiscoBus {
  constructor(options = { init: true, start: true, bootstrap: 'lfc', forceJS: false, star: false, network: 'leofcoin' }) {
    super();
    this.network = options.network || 'leofcoin';
    
    this.account = new LFCAccount(this.network);
    if (options.init) return this._init(options)
  }
  
  async hasDaemon() {
    try {
      let response = await fetch('http://127.0.0.1:5050/api/version');
      response = await response.text();
      if (!isNaN(Number(response))) return true
      else return false
    } catch (e) {
      return false
    }
  }
  
  async environment() {
    const _navigator = globalThis.navigator;
    if (_navigator && /electron/i.test(_navigator.userAgent) || !_navigator) {
      return 'node'
    } else {
      return 'browser'
    }
  }
  
  async target() {
    let daemon = false;
    const environment = this.environment();
    if (!https) daemon = await this.hasDaemon();
    
    return { daemon, environment }
  }
  
  async _spawn(config = {}, forceJS = false, wallet = {}) {
    if (!config.target) config.target = await this.target();
    if (config.target.daemon && !forceJS) {
      let response = await fetch('http://127.0.0.1:5050/api/config');
      wallet = await response.json();
      const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource; 
      this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');
      return
    } else if (config.target.environment === 'node' && !forceJS){
      const { run } = require('@leofcoin/daemon');
      await run();
      const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource;
      this.ipfs = new IpfsHttpClient('/ip4/127.0.0.1/tcp/5555');  
      return
    } else {
      await new Promise((resolve, reject) => {
      if (!LeofcoinStorage) LeofcoinStorage = require('@leofcoin/storage');
      resolve();
    });
      globalThis.accountStore = new LeofcoinStorage('lfc-account', `.leofcoin/${this.network}`);
      globalThis.chainStore = new LeofcoinStorage('lfc-chain', `.leofcoin/${this.network}`);
      globalThis.walletStore = new LeofcoinStorage('lfc-wallet', `.leofcoin/${this.network}`);
      const account = await accountStore.get();
      wallet = await walletStore.get();
      if (!wallet.identity) {
        const { identity, accounts, config } = await this.account.generateProfile();
        wallet.identity = identity;
        wallet.accounts = accounts;
        walletStore.put(wallet);
        await accountStore.put('config', config);
        await accountStore.put('public', { walletId: wallet.identity.walletId });
      }
      return await this.spawnJsNode(wallet, config.bootstrap, config.star)
    }
  }
  
  async _init({start, bootstrap, forceJS, star}) {
    await this._spawn({bootstrap, star}, forceJS);
    
    this.api = {
      addFromFs: async (path, recursive = true) => {
        if (!globalThis.globSource) {
          const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource;
        }
        console.log(globSource(path, { recursive }));
        const files = [];
        for await (const file of this.ipfs.add(globSource(path, { recursive }))) {
          files.push(file);
        }
        return files;
      }
    };
    // await globalApi(this)
    return this
  }
  
  async spawnJsNode (config, bootstrap, star) {    
    await new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve();
      });
    
      if (!https && !globalThis.window) {
        config.Addresses = {
      
        Swarm: [
          '/ip6/::/tcp/4020',
          '/ip4/0.0.0.0/tcp/4010',
          '/ip4/0.0.0.0/tcp/4030/ws'
        ],
        Gateway: '/ip4/0.0.0.0/tcp/8080',
        API: '/ip4/127.0.0.1/tcp/5555',
        Delegates: ['node0.preload.ipfs.io']
        
      };
      // if (star) config.Addresses.Swarm.push('/ip4/0.0.0.0/tcp/4030/ws');
      } else {
        config.Addresses = {
          Swarm: [],
          API: '',
          Gateway: '',
          Delegates: ['node0.preload.ipfs.io']        
        };
      }
      
    if (bootstrap === 'lfc') {
      if (https) {
        bootstrap = [
         '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmbRqQkqqXbEH9y4jMg1XywAcwJCk4U8ZVaYZtjHdXKhpL'
       ];  
     } else if (globalThis.window && !/electron/i.test(navigator.userAgent)){
        bootstrap = [
         '/dns4/star.leofcoin.org/tcp/4030/ws/p2p/QmbRqQkqqXbEH9y4jMg1XywAcwJCk4U8ZVaYZtjHdXKhpL'
       ];
     } else {
       bootstrap = [
        '/dns4/star.leofcoin.org/tcp/4020/p2p/QmbRqQkqqXbEH9y4jMg1XywAcwJCk4U8ZVaYZtjHdXKhpL'
      ];
     }
      
    } else if (star) bootstrap = [];
    
    config = {
      pass: config.identity.privateKey,
      repo: walletStore.root,
      ipld: {
        async loadFormat (codec) {
          if (codec === multicodec.LEOFCOIN_BLOCK) {
            return Promise.resolve().then(function () { return _interopNamespace(require('ipld-lfc')); })
          } else if (codec === multicodec.LEOFCOIN_TX) {
            return Promise.resolve().then(function () { return _interopNamespace(require('ipld-lfc-tx')); })
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
        Addresses: config.Addresses,
        API: {
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['http://localhost'],
            'Access-Control-Allow-Methods': ['GET', 'PUT', 'POST']
          }
        }
      },
      relay: {
        enabled: true,
        hop: { enabled: true }
      },
      EXPERIMENTAL: { ipnsPubsub: true, sharding: true }
    };
    
    try {
      this.ipfs = await Ipfs.create(config);
      const { id, addresses, publicKey } = await this.ipfs.id();
      this.addresses = addresses;
      this.peerId = id;
      this.publicKey = publicKey;
      
      const strap = await this.ipfs.config.get('Bootstrap');
      for (const addr of strap) {
        await this.ipfs.swarm.connect(addr);
      }
    } catch (e) {
      console.error(e);
    }
    
    
  }
  
  
}

module.exports = LeofcoinApi;

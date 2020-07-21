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

var MultiWallet = _interopDefault(require('@leofcoin/multi-wallet'));
var fetch = _interopDefault(require('node-fetch'));
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

class e{static hasCamera(){return navigator.mediaDevices?navigator.mediaDevices.enumerateDevices().then(a=>a.some(a=>"videoinput"===a.kind)).catch(()=>!1):Promise.resolve(!1)}constructor(a,b,c=this._onDecodeError.bind(this),d=e.DEFAULT_CANVAS_SIZE,f="environment"){this.$video=a;this.$canvas=document.createElement("canvas");this._onDecode=b;this._preferredFacingMode=f;this._flashOn=this._paused=this._active=!1;"number"===typeof c?(d=c,console.warn("You're using a deprecated version of the QrScanner constructor which will be removed in the future")):
this._onDecodeError=c;this.$canvas.width=d;this.$canvas.height=d;this._sourceRect={x:0,y:0,width:d,height:d};this._updateSourceRect=this._updateSourceRect.bind(this);this._onPlay=this._onPlay.bind(this);this._onVisibilityChange=this._onVisibilityChange.bind(this);this.$video.playsInline=!0;this.$video.muted=!0;this.$video.disablePictureInPicture=!0;this.$video.addEventListener("loadedmetadata",this._updateSourceRect);this.$video.addEventListener("play",this._onPlay);document.addEventListener("visibilitychange",
this._onVisibilityChange);this._qrEnginePromise=e.createQrEngine();}hasFlash(){if(!("ImageCapture"in window))return Promise.resolve(!1);let a=this.$video.srcObject?this.$video.srcObject.getVideoTracks()[0]:null;return a?(new ImageCapture(a)).getPhotoCapabilities().then(a=>a.fillLightMode.includes("flash")).catch(a=>{console.warn(a);return !1}):Promise.reject("Camera not started or not available")}isFlashOn(){return this._flashOn}toggleFlash(){return this._setFlash(!this._flashOn)}turnFlashOff(){return this._setFlash(!1)}turnFlashOn(){return this._setFlash(!0)}destroy(){this.$video.removeEventListener("loadedmetadata",
this._updateSourceRect);this.$video.removeEventListener("play",this._onPlay);document.removeEventListener("visibilitychange",this._onVisibilityChange);this.stop();e._postWorkerMessage(this._qrEnginePromise,"close");}start(){if(this._active&&!this._paused)return Promise.resolve();"https:"!==window.location.protocol&&console.warn("The camera stream is only accessible if the page is transferred via https.");this._active=!0;this._paused=!1;if(document.hidden)return Promise.resolve();clearTimeout(this._offTimeout);
this._offTimeout=null;if(this.$video.srcObject)return this.$video.play(),Promise.resolve();let a=this._preferredFacingMode;return this._getCameraStream(a,!0).catch(()=>{a="environment"===a?"user":"environment";return this._getCameraStream()}).then(b=>{a=this._getFacingMode(b)||a;this.$video.srcObject=b;this.$video.play();this._setVideoMirror(a);}).catch(a=>{this._active=!1;throw a;})}stop(){this.pause();this._active=!1;}pause(){this._paused=!0;this._active&&(this.$video.pause(),this._offTimeout||(this._offTimeout=
setTimeout(()=>{let a=this.$video.srcObject?this.$video.srcObject.getTracks():[];for(let b of a)b.stop();this._offTimeout=this.$video.srcObject=null;},300)));}static scanImage(a,b=null,c=null,d=null,f=!1,k=!1){let g=c instanceof Worker,h=Promise.all([c||e.createQrEngine(),e._loadImage(a)]).then(([a,h])=>{c=a;let k;[d,k]=this._drawToCanvas(h,b,d,f);return c instanceof Worker?(g||c.postMessage({type:"inversionMode",data:"both"}),new Promise((a,b)=>{let f,l,g;l=d=>{"qrResult"===d.data.type&&(c.removeEventListener("message",
l),c.removeEventListener("error",g),clearTimeout(f),null!==d.data.data?a(d.data.data):b(e.NO_QR_CODE_FOUND));};g=a=>{c.removeEventListener("message",l);c.removeEventListener("error",g);clearTimeout(f);b("Scanner error: "+(a?a.message||a:"Unknown Error"));};c.addEventListener("message",l);c.addEventListener("error",g);f=setTimeout(()=>g("timeout"),1E4);let h=k.getImageData(0,0,d.width,d.height);c.postMessage({type:"decode",data:h},[h.data.buffer]);})):new Promise((a,b)=>{let f=setTimeout(()=>b("Scanner error: timeout"),
1E4);c.detect(d).then(c=>{c.length?a(c[0].rawValue):b(e.NO_QR_CODE_FOUND);}).catch(a=>b("Scanner error: "+(a.message||a))).finally(()=>clearTimeout(f));})});b&&k&&(h=h.catch(()=>e.scanImage(a,null,c,d,f)));return h=h.finally(()=>{g||e._postWorkerMessage(c,"close");})}setGrayscaleWeights(a,b,c,d=!0){e._postWorkerMessage(this._qrEnginePromise,"grayscaleWeights",{red:a,green:b,blue:c,useIntegerApproximation:d});}setInversionMode(a){e._postWorkerMessage(this._qrEnginePromise,"inversionMode",a);}static createQrEngine(a=
e.WORKER_PATH){return ("BarcodeDetector"in window?BarcodeDetector.getSupportedFormats():Promise.resolve([])).then(b=>-1!==b.indexOf("qr_code")?new BarcodeDetector({formats:["qr_code"]}):new Worker(a))}_onPlay(){this._updateSourceRect();this._scanFrame();}_onVisibilityChange(){document.hidden?this.pause():this._active&&this.start();}_updateSourceRect(){let a=Math.round(2/3*Math.min(this.$video.videoWidth,this.$video.videoHeight));this._sourceRect.width=this._sourceRect.height=a;this._sourceRect.x=(this.$video.videoWidth-
a)/2;this._sourceRect.y=(this.$video.videoHeight-a)/2;}_scanFrame(){if(!this._active||this.$video.paused||this.$video.ended)return !1;requestAnimationFrame(()=>{1>=this.$video.readyState?this._scanFrame():this._qrEnginePromise.then(a=>e.scanImage(this.$video,this._sourceRect,a,this.$canvas,!0)).then(this._onDecode,a=>{this._active&&(-1!==(a.message||a).indexOf("service unavailable")&&(this._qrEnginePromise=e.createQrEngine()),this._onDecodeError(a));}).then(()=>this._scanFrame());});}_onDecodeError(a){a!==
e.NO_QR_CODE_FOUND&&console.log(a);}_getCameraStream(a,b=!1){let c=[{width:{min:1024}},{width:{min:768}},{}];a&&(b&&(a={exact:a}),c.forEach(b=>b.facingMode=a));return this._getMatchingCameraStream(c)}_getMatchingCameraStream(a){return navigator.mediaDevices&&0!==a.length?navigator.mediaDevices.getUserMedia({video:a.shift()}).catch(()=>this._getMatchingCameraStream(a)):Promise.reject("Camera not found.")}_setFlash(a){return this.hasFlash().then(b=>b?this.$video.srcObject.getVideoTracks()[0].applyConstraints({advanced:[{torch:a}]}):
Promise.reject("No flash available")).then(()=>this._flashOn=a)}_setVideoMirror(a){this.$video.style.transform="scaleX("+("user"===a?-1:1)+")";}_getFacingMode(a){return (a=a.getVideoTracks()[0])?/rear|back|environment/i.test(a.label)?"environment":/front|user|face/i.test(a.label)?"user":null:null}static _drawToCanvas(a,b=null,c=null,d=!1){c=c||document.createElement("canvas");let f=b&&b.x?b.x:0,k=b&&b.y?b.y:0,g=b&&b.width?b.width:a.width||a.videoWidth;b=b&&b.height?b.height:a.height||a.videoHeight;
d||c.width===g&&c.height===b||(c.width=g,c.height=b);d=c.getContext("2d",{alpha:!1});d.imageSmoothingEnabled=!1;d.drawImage(a,f,k,g,b,0,0,c.width,c.height);return [c,d]}static _loadImage(a){if(a instanceof HTMLCanvasElement||a instanceof HTMLVideoElement||window.ImageBitmap&&a instanceof window.ImageBitmap||window.OffscreenCanvas&&a instanceof window.OffscreenCanvas)return Promise.resolve(a);if(a instanceof Image)return e._awaitImageLoad(a).then(()=>a);if(a instanceof File||a instanceof Blob||a instanceof
URL||"string"===typeof a){let b=new Image;b.src=a instanceof File||a instanceof Blob?URL.createObjectURL(a):a;return e._awaitImageLoad(b).then(()=>{(a instanceof File||a instanceof Blob)&&URL.revokeObjectURL(b.src);return b})}return Promise.reject("Unsupported image type.")}static _awaitImageLoad(a){return new Promise((b,c)=>{if(a.complete&&0!==a.naturalWidth)b();else {let d,f;d=()=>{a.removeEventListener("load",d);a.removeEventListener("error",f);b();};f=()=>{a.removeEventListener("load",d);a.removeEventListener("error",
f);c("Image load error");};a.addEventListener("load",d);a.addEventListener("error",f);}})}static _postWorkerMessage(a,b,c){return Promise.resolve(a).then(a=>{a instanceof Worker&&a.postMessage({type:b,data:c});})}}e.DEFAULT_CANVAS_SIZE=400;e.NO_QR_CODE_FOUND="No QR code found";e.WORKER_PATH="qr-scanner-worker.min.js";

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
    const mnemonic = await wallet.generate();
    /**
     * @type {object}
     */
    const account = wallet.account(0);
    /**
     * @type {object}
     */
    const external = account.external(0);
    const internal = account.internal(0);
    
    return {
      identity: {
        mnemonic,
        multiWIF: wallet.export(),
        publicKey: external.publicKey,
        privateKey: external.privateKey,
        walletId: external.id
      },
      accounts: [['main account', external.address, internal.address]],
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
        await wallet.recover(identity.mnemonic);
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
    
    const identity = await walletStore.get('identity');
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
      response = await response.json();
      return Boolean(response.client === '@leofcoin/api/http')
    } catch (e) {
      return false
    }
  }

  async environment() {
    const _navigator = globalThis.navigator;
    if (!_navigator) {
      return 'node'
    } else if (_navigator && /electron/i.test(_navigator.userAgent)) {
      return 'electron'
    } else {
      return 'browser'
    }
  }

  async target() {
    let daemon = false;
    const environment = await this.environment();
    if (!https) daemon = await this.hasDaemon();

    return { daemon, environment }
  }

  async _spawn(config = {}, forceJS = false, wallet = {}) {
    if (!config.target) config.target = await this.target();
    if (config.target.daemon && !forceJS) {
      let response = await fetch('http://127.0.0.1:5050/api/wallet', {});
      wallet = await response.json();
      const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource;
      // TODO: give client its own package
      // globalThis.HttpClient = require('./http/http-client')_disabled
      
      
      // const client = new HttpClient({ host: '127.0.0.1', port: 5050, pass: wallet.identity.privateKey});
      // globalThis.api = client.api
      // globalThis.ipfs = client.ipfs
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
        wallet.version = 1;
        walletStore.put(wallet);
        await accountStore.put('config', config);
        await accountStore.put('public', { walletId: wallet.identity.walletId });
      } else {
        // check if we are using correct accounts version
        // if arr[0] is not an array, it means old version
        if (!Array.isArray(wallet.accounts[0])) wallet.accounts = [wallet.accounts];
        
        // ensure we don't need barbaric methods again.
        if (!wallet.version) wallet.version = 1;
        
        // TODO: convert accounts[account] to objbased { name, addresses }
      }
      const multiWallet = new MultiWallet(this.network);
      multiWallet.import(wallet.identity.multiWIF);
      globalThis.leofcoin.wallet = multiWallet;
      // if (config.target.environment === 'node' || config.target.environment === 'electron') {
      //   globalThis.http = require('./http/http')
      //   http()
      // }
      // globalThis.HttpClient = require('./http/http-client')
      // const client = new HttpClient({ host: '127.0.0.1', port: 5050, pass: wallet.identity.privateKey});
      // globalThis.ipfs = client.ipfs
      // globalThis.api = client.api
      return await this.spawnJsNode(wallet, config.bootstrap, config.star, config.target)
    }
  }

  async _init({start, bootstrap, forceJS, star}) {
    await this._spawn({bootstrap, star}, forceJS);
    // await globalApi(this)
    return this
  }

  async spawnJsNode (config, bootstrap, star, { environment }) {
    await new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve();
      });
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

      };
      // if (star) config.Addresses.Swarm.push('/ip4/0.0.0.0/tcp/4030/ws');
      } else {
        config.Addresses = {
          Swarm: [],
          API: '',
          Gateway: '',
          Delegates: ['node0.delegate.ipfs.io/tcp/443/https']
        };
      }

    if (bootstrap === 'lfc') {
      if (environment === 'browser' && https || environment === 'electron') {
        bootstrap = [
         '/dns4/star.leofcoin.org/tcp/4003/wss/p2p/QmbBM3idU5h5Gw73YoncGfjXJhzxveNvefpYwMbLAZWvk4'
       ];
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
    };

    try {
      globalThis.ipfs = await Ipfs.create(config);
      const { id, addresses, publicKey } = await ipfs.id();
      this.addresses = addresses;
      this.peerId = id;
      this.publicKey = publicKey;

      const strap = await ipfs.config.get('Bootstrap');
      for (const addr of strap) {
        await ipfs.swarm.connect(addr);
      }
      
      const IpfsHttpClient = require('ipfs-http-client');
      globalThis.IpfsHttpClient = IpfsHttpClient;
      const { globSource } = IpfsHttpClient;
      globalThis.globSource = globSource;
      
      ipfs.addFromFs = async (path, recursive = false) => {
        const files = [];
        for await (const file of globalThis.ipfs.addAll(globSource(path, { recursive }))) {
          files.push(file);
        }
        return files;
      };
    } catch (e) {
      console.error(e);
    }


  }


}

module.exports = LeofcoinApi;

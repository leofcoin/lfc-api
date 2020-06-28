'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Koa = _interopDefault(require('koa'));
var Router = _interopDefault(require('@koa/router'));
var fs = require('fs');
var util = require('util');
require('path');
var bodyParser = _interopDefault(require('koa-bodyparser'));
var cors = _interopDefault(require('@koa/cors'));

const getConfig = async () => await accountStore.get('config');

const setConfig = async data => await accountStore.put('config', data);

const setMinerConfig = async minerConfig => {
  const data = await getConfig();
  data.miner = minerConfig;
  await setConfig(data);
  return;
};

var api = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getConfig: getConfig,
  setConfig: setConfig,
  setMinerConfig: setMinerConfig
});

var version = "2.14.3";
var dependencies = {
	"@koa/cors": "^3.1.0",
	"@koa/router": "^9.0.1",
	"@leofcoin/daemon": "^1.0.15",
	"@leofcoin/disco-bus": "^1.0.4",
	"@leofcoin/multi-wallet": "^2.0.0",
	"@leofcoin/storage": "^2.0.0",
	base32: "0.0.6",
	base58: "^2.0.1",
	ipfs: "^0.46.0",
	"ipfs-http-client": "^44.2.0",
	"ipld-lfc": "^0.1.4",
	"ipld-lfc-tx": "^0.3.3",
	"koa-bodyparser": "^4.3.0",
	libp2p: "^0.28.3",
	"libp2p-delegated-content-routing": "^0.5.0",
	"libp2p-delegated-peer-routing": "^0.5.0",
	"libp2p-kad-dht": "^0.19.7",
	"little-pubsub": "^1.1.0",
	"node-fetch": "^2.6.0",
	"peer-id": "^0.13.12",
	"qr-scanner": "^1.1.1",
	qrcode: "^1.4.4"
};

const router = new Router();

router.get('/api/version', ctx => {
  ctx.body = {client: '@leofcoin/api/http', version};
});

router.get('/api/account', async ctx => {
  ctx.body = JSON.stringify(await accountStore.get());
});

router.get('/api/wallet', async ctx => {
  ctx.body = await walletStore.get();
});

router.get('/api/config', ctx => {
  if (ctx.request.query.miner) ctx.body = undefined();
  else ctx.body = getConfig();
});

router.put('/api/config', ctx => {
  if (ctx.request.query === 'miner') setMinerConfig(ctx.request.query.miner);
  else setConfig(ctx.request.query.value);
});

router.put('/api/config/miner', ctx => {
  console.log(ctx.request.query, ctx.request.query.intensity);
  if (ctx.request.query.intensity) setMinerConfig({intensity: ctx.request.query.intensity});
  // else api.setConfig(ctx.request.query.value)
});

router.get('/api/mine', ctx => {
  undefined(undefined());
});

const readdir = util.promisify(fs.readdir);

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

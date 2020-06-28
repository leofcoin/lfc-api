import Router from '@koa/router'
import {dependencies} from './../../package.json'
import { readdir as _readdir } from 'fs'
import { promisify } from 'util'

import { posix, basename, parse, relative } from 'path'

const readdir = promisify(_readdir)

const version = dependencies.ipfs.replace('^', '');

const router = new Router()

// router.use((ctx, next) => {
//   ctx.json = ctx.request.body
//   ctx.data = ctx.request.query.data
// 
//   next()
// })

router.get('/ipfs/version', ctx => {
  ctx.body = {client: '@leofcoin/ipfs/http', version}
})

router.put('/ipfs/addFromFs', async ctx => {
  if (!globalThis.globSource) {
    GLOBSOURCE_IMPORT
  }
  const files = []
  const glob = await globSource(ctx.request.query.data, {recursive: true})
  for await (const file of ipfs.add(glob)) {
    files.push(file)
  }
  ctx.set('content-type', 'application/json')
  ctx.body = files.map(file => {
    file.cid = file.cid.toString()
    return file
  });
  return 
})

router.get('/ipfs/block', async ctx => {
  const value = await ipfs.block.get(ctx.request.query.data)
  ctx.body = value
})

router.put('/ipfs/block', async ctx => {
  const value = await ipfs.block.put(ctx.request.query.data)
  ctx.body = value
})

router.get('/ipfs/key/list', async ctx => {
  const value = await ipfs.key.list()
  ctx.set('content-type', 'application/json')
  ctx.body = value
})

router.get('/ipfs/key/gen', async ctx => {
  const value = await ipfs.key.gen(ctx.request.query.data)
  ctx.set('content-type', 'application/json')
  ctx.body = value
})

router.put('/ipfs/pin/add', async ctx => {
  
  const value = await ipfs.pin.add(ctx.request.query.data)
  ctx.set('content-type', 'application/json')
  ctx.body = value
})

router.put('/ipfs/dag', async ctx => {
  const { dag, format, hashAlg } = ctx.request.body
  
  const value = await ipfs.dag.put(dag, {format, hashAlg})
  ctx.body = value
  return
})

router.get('/ipfs/dag', async ctx => {
  const { path, format, hashAlg } = ctx.request.body
  
  const value = await ipfs.dag.put(path, {format, hashAlg})
  ctx.body = value
  return
})

router.get('/ipfs/dag/tree', async ctx => {
  const { path, hash } = ctx.request.body
  ctx.body = await ipfs.dag.tree(hash, path)
})

router.get('/ipfs/name/resolve', async ctx => {
  const { hash } = ctx.request.body
  ctx.body = await ipfs.name.resolve(hash)
})

router.put('/ipfs/name/publish', async ctx => {
  const { hash } = ctx.request.body
  ctx.body = await ipfs.name.publish(hash)
})

export default router
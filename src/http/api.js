import Router from '@koa/router'
import * as api from './../core'
import {version} from './../../package.json'

const router = new Router()

router.get('/api/version', ctx => {
  ctx.body = {client: '@leofcoin/api/http', version}
})

router.get('/api/account', async ctx => {
  ctx.body = JSON.stringify(await accountStore.get())
})

router.get('/api/wallet', async ctx => {
  ctx.body = await walletStore.get()
})

router.get('/api/config', ctx => {
  if (ctx.request.query.miner) ctx.body = api.getMinerConfig()
  else ctx.body = await api.getConfig()
})

router.put('/api/config', ctx => {
  if (ctx.request.query === 'miner') api.setMinerConfig(ctx.request.query.miner)
  else api.setConfig(ctx.request.query.value)
})

router.put('/api/config/miner', ctx => {
  console.log(ctx.request.query, ctx.request.query.intensity);
  if (ctx.request.query.intensity) api.setMinerConfig({intensity: ctx.request.query.intensity})
  // else api.setConfig(ctx.request.query.value)
})

router.get('/api/mine', ctx => {
  api.mine(api.getMinerConfig())
})

export default router
import Koa from 'koa'
import api from './api'
import ipfs from './ipfs'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

export default () => {
  const app = new Koa();
  
  app.use(cors());
  app.use(bodyParser())
  
  app.use(api.routes())
  app.use(api.allowedMethods())
  
  app.use(ipfs.routes())
  app.use(ipfs.allowedMethods())
    
  app.listen(5050, () => console.log('api listening on 5050'))
}
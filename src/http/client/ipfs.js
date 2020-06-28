import HttpClientApi from './http-client-api'

export default class extends HttpClientApi {
  constructor(config = {}) {
    config.apiPath = 'ipfs'
    super(config)
  }
  
  async addFromFs(path) {
    return this.put(`addFromFs?data=${path}`);
  }
  
  get pin() {
    return {
      add: path => this.put(`pin/add?data=${path}`)
    }
  }
  
  get key() {
    return {
      list: () => this.get('key/list'),
      gen: name => this.get(`key/gen?data=${name}`)
    }
  }
  
  get name() {
    return {
      publish: hash => this.put('name/publish', { hash }),
      resolve: hash => this.get('name/resolve', { hash })
    }
  }
  
  get dag() {
    return {
      get: async (path, options= {}) => {
        const format = options.format
        const hashAlg = options.hashAlg
        return this.get('dag', { path, format, hashAlg })
      },
      put: async (dag, options= {}) => {
        const format = options.format
        const hashAlg = options.hashAlg
        return this.put('dag', { dag, format, hashAlg })
      },
      tree: async (cid, path) => {
        return this.get('dag/tree', { hash, path })
      }
    }    
  }
}
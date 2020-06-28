'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fetch = _interopDefault(require('node-fetch'));

class HttpClientApi {
  constructor(config) {
    if (!config.protocol) config.protocol = 'http';
    if (!config.port) config.port = 5050;
    if (!config.host) config.host = '127.0.0.1';
    if (!config.apiPath) config.apiPath = 'api';
    
    const address = `${config.protocol}://${config.host}:${config.port}/${config.apiPath}`;
    
    this.apiUrl = url => `${address}/${url}`;
  }
  
  async get (url, obj) {
    const headers = {};
    let body = null;
    let method = 'GET';
    if (obj) {
      method = 'POST';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(obj);
    }
    let response = await fetch(this.apiUrl(url), { headers, body, method });
    const type = response.headers.get('content-type').split(';')[0];
    if (type==='application/json') response = await response.json();
    return response
  }
  
  async put (url, obj) {
    const headers = {};
    let body = {};
    if (obj) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(obj);
    }
    
    let response = await fetch(this.apiUrl(url), { method: 'PUT', headers, body});
    const type = response.headers.get('content-type').split(';')[0];
    if (type==='application/json') response = await response.json();
    return response
  }
}

class IpfsClientApi extends HttpClientApi {
  constructor(config = {}) {
    config.apiPath = 'ipfs';
    super(config);
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
        const format = options.format;
        const hashAlg = options.hashAlg;
        return this.get('dag', { path, format, hashAlg })
      },
      put: async (dag, options= {}) => {
        const format = options.format;
        const hashAlg = options.hashAlg;
        return this.put('dag', { dag, format, hashAlg })
      },
      tree: async (cid, path) => {
        return this.get('dag/tree', { hash, path })
      }
    }    
  }
}

class ApiClientApi extends HttpClientApi {
  constructor(config = {}) {
    config.apiPath = 'api';
    super(config);
  }
}

class HttpClient {
  constructor(config = {}) {
    this.ipfs = new IpfsClientApi();
    this.api = new ApiClientApi();
  }  
}

module.exports = HttpClient;

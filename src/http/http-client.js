import IpfsClientApi from './client/ipfs'
import ApiClientApi from './client/api'

export default class HttpClient {
  constructor(config = {}) {
    this.ipfs = new IpfsClientApi()
    this.api = new ApiClientApi()
  }  
}
import HttpClientApi from './http-client-api'

export default class extends HttpClientApi {
  constructor(config = {}) {
    config.apiPath = 'api'
    super(config)
  }
}
import { distanceInKmBetweenEarthCoordinates, parseAddress, getAddress } from './../utils'
import fetch from 'node-fetch';

export default class DhtEarth {
  /**
   * 
   */
  constructor() {
    this.providerMap = new Map();
  }
  
  /**
   * 
   */
  async getCoordinates(provider) {
    const {address} = parseAddress(provider)
    console.log({address});
    const request = `https://tools.keycdn.com/geo.json?host=${address}`
    let response = await fetch(request)
    response = await response.json()
    console.log(response);
    const { latitude, longitude } = response.data.geo;
    return { latitude, longitude }
  }
  
  /**
   * 
   */
  async getDistance(peer, provider) {
    const { latitude, longitude } = await this.getCoordinates(provider)
    return {provider, distance: distanceInKmBetweenEarthCoordinates(peer.latitude,peer.longitude,latitude,longitude)}
  }
  
  /**
   * 
   */
  async closestPeer(providers) {
    let all = []
    const address = await getAddress();
    const peerLoc = await this.getCoordinates(address)
    
    for (const provider of providers) {
      all.push(this.getDistance(peerLoc, provider))
    }
    
    all = await Promise.all(all)
    
    const closestPeer = all.reduce((p, c) => {
      console.log(c);
      if (c.distance < p || p === 0) return c.provider;
    }, 0)
    
    return closestPeer;
  }
  
  /**
   * 
   */
  async providersFor(hash) {
    return this.providerMap.get(hash);
  }  
  
  /**
   * 
   */  
  async addProvider(address, hash) {
    let providers = [];
    if (this.providerMap.has(hash)) providers = this.providerMap.get(hash)
      
    providers = new Set([...providers, address])
    this.providerMap.set(hash, providers)
    return providers;
  }
  
  
}
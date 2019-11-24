import ip from 'ip';
import fetch from 'node-fetch';
import hyphenate from './../node_modules/backed/src/utils/hyphenate.js';
import { DEFAULT_CONFIG, DEFAULT_NODE_DISCOVERY_CONFIG, DEFAULT_BROWSER_DISCOVERY_CONFIG } from './constants';

const expected = (expected, actual) => {
  const entries = Object.entries(actual)
    .map(entry => entry.join(!entry[1] ? `: undefined - ${entry[1]} ` : `: ${typeof entry[1]} - `));

  return `\nExpected:\n\t${expected.join('\n\t')}\n\nactual:\n\t${entries.join('\n\t')}`;
}

const merge = (object, source) => {
  for (const key of Object.keys(object)) {
    if (typeof object[key] === 'object' && source[key] && !Array.isArray(source[key])) object[key] = merge(object[key], source[key])
    else if(source[key] && typeof object[key] !== 'object'|| Array.isArray(source[key])) object[key] = source[key]
  }
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !object[key] && !Array.isArray(source[key])) object[key] = merge(object[key] || {}, source[key])
    else if (typeof source[key] !== 'object' && !object[key] || Array.isArray(source[key])) object[key] = source[key];
  }
  return object
}

const envConfig = () => {
  if (typeof window === 'undefined') {
    DEFAULT_CONFIG.discovery = DEFAULT_NODE_DISCOVERY_CONFIG;
  } else {
    DEFAULT_CONFIG.discovery = DEFAULT_BROWSER_DISCOVERY_CONFIG;
  }
  return DEFAULT_CONFIG;
}

const degreesToRadians = degrees => {
  return degrees * Math.PI / 180;
}

const distanceInKmBetweenEarthCoordinates = (lat1, lon1, lat2, lon2) => {
  var earthRadiusKm = 6371;

  var dLat = degreesToRadians(lat2-lat1);
  var dLon = degreesToRadians(lon2-lon1);

  lat1 = degreesToRadians(lat1);
  lat2 = degreesToRadians(lat2);
console.log(lat1, lat2);
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return earthRadiusKm * c;
}

const isDomain = address => {
  if (ip.toLong(address) === 0) return true;
  return false;
}

const parseAddress = address => {
  const parts = address.split('/');
  if (isDomain(parts[0]) && isNaN(parts[1])) {
    return {
      address: parts[0],
      port: 8080,
      protocol: parts[1],
      peerId: parts[2]
    }
  }
  return {
    address: parts[0],
    port: Number(parts[1]),
    protocol: parts[2],
    peerId: parts[3]
  }
}

const lastFetched = {
  time: 0,
  address: undefined
}
const getAddress = async () => {
  let {address, time} = lastFetched
  const now = Math.round(new Date().getTime() / 1000);
  if (now - time > 300) {
    address = await fetch('https://icanhazip.com/')
    address = await address.text()
    lastFetched.address = address;
    lastFetched.time = Math.round(new Date().getTime() / 1000);  
  }
  
  return address
}

const debug = text => {
  if (process.env.debug) {
    console.log(text);
  }
}

export { debug, expected, merge, parseAddress, getAddress, envConfig, degreesToRadians, distanceInKmBetweenEarthCoordinates }
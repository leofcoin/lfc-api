import fetch from 'node-fetch';
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

const lastFetched = {
  address: {
    value: undefined,
    timestamp: 0
  },
  ptr: {
    value: undefined,
    timestamp: 0
  }
}
const getAddress = async () => {
  const {address} = lastFetched
  const now = Math.round(new Date().getTime() / 1000);
  if (now - address.timestamp > 300) {
    address.value = await fetch('https://ipv6.icanhazip.com/')
    address.value = await address.value.text()
    address.timestamp = Math.round(new Date().getTime() / 1000);  
    lastFetched.address = address;
  }
  
  return address.value
}

/**
 * get ptr (public hostname) for ip
 * @params {string} ip - ip
 */
const getPtrFor = async ip => {
  let value = await fetch('https://ipv6.icanhazptr.com/')
  value = await value.text()
  console.log(value);
  return value
}

/**
 * ptr public hostname
 * @params {string} ip - ip
 */
const getPtr = async () => {
  const {ptr} = lastFetched
  const now = Math.round(new Date().getTime() / 1000);
  if (now - ptr.timestamp > 300) {
    const address = await getAddress()
    ptr.value = await getPtrFor(address)
    ptr.timestamp = Math.round(new Date().getTime() / 1000);  
    lastFetched.ptr = ptr;
  }
  return ptr.value
}

const debug = text => {
  if (process.env.debug) {
    console.log(text);
  }
}

export { debug, expected, merge, getAddress, degreesToRadians, distanceInKmBetweenEarthCoordinates }
import versions from './../versions.json';
import { version } from './../../package.json';
import Storage from './../../node_modules/lfc-storage/src/level.js';
import { merge } from './../utils';

export default async config => {
  let start = Object.keys(versions).indexOf(config.version.toString());
  const end = Object.keys(versions).indexOf(version);
  console.log(start, end);
  // get array of versions to upgrade to
  const _versions = Object.keys(versions).slice(start, end)
  console.log(_versions);
  console.log({ver: versions[version]});
  // apply config for each greater version
  // until current version is applied
  for (const key of _versions) {
    const _config = versions[key]
    console.log(_config);
    config = merge(config, _config)
    
    // if (key === '1.0.16' || key === '1.0.17' || key === '1.0.23' || key === '1.0.26') {
    
    // }
    config.version = key;
  }
  await configStore.put(config)
  return config;
}
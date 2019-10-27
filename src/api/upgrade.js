import versions from './../versions.json';
import { version } from './../../package.json';
import Storage from './../../node_modules/lfc-storage/src/level.js';
import { merge, envConfig } from './../utils';

export default async config => {
  const start = Object.keys(versions).indexOf(config.version);
  const end = Object.keys(versions).indexOf(version);
  // get array of versions to upgrade to
  const _versions = Object.keys(versions).slice(start, end + 1)
  console.log({ver: versions[version]});
  // apply config for each greater version
  // until current version is applied
  for (const key of _versions) {
    const _config = versions[key]
    console.log(_config);
    config = merge(config, _config)
    if (key === '1.0.1') {
      globalThis.accountStore = new Storage(config.storage.account)
      await accountStore.put({ public: { peerId: config.identity.peerId }})
    }
    if (key === '1.0.16' || key === '1.0.17' || key === '1.0.23' || key === '1.0.26') {
      const defaultConfig = envConfig();
      config.discovery = defaultConfig.discovery;
    }
    config.version = key;
  }
  await configStore.put(config)
  return config;
}
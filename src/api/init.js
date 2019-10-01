import Storage from './../../node_modules/lfc-storage/src/level.js';
import { DEFAULT_CONFIG } from './../constants';
import upgrade from './upgrade';
import { merge } from './../utils';

export default async _config => {
  globalThis.configStore = new Storage('config')
  
  let config = await configStore.get()
  if (!config || Object.keys(config).length === 0) {
    config = merge(DEFAULT_CONFIG, config)
    config = merge(config, _config)
    
    // private node configuration & identity
    await configStore.put(config);
    // by the public accessible account details
  }
  
  config = await upgrade(config)
  
  for (let path of Object.keys(config.storage)) {
    path = config.storage[path];
    const store = `${path}Store`;
    if (!globalThis[store]) globalThis[store] = new Storage(path)
  }
  
  return config;
}
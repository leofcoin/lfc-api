import upgrade from './upgrade';
import { merge } from './../utils';
import { DEFAULT_CONFIG } from './../constants';

export default async _config => {
  await STORAGE_IMPORT
  
  globalThis.configStore = new LeofcoinStorage('lfc-config')
  globalThis.accountStore = new LeofcoinStorage('lfc-account')
  
  let config = await configStore.get()
  if (!config || Object.keys(config).length === 0) {
    config = merge(DEFAULT_CONFIG, config)
    config = merge(config, _config)
    
    // private node configuration & identity
    await configStore.put(config);
    // by the public accessible account details
  }
  
  // config = await upgrade(config)
  
  return config;
}
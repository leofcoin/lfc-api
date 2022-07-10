import { LevelDatastore } from 'datastore-level'
import { homedir } from 'os'
import { join } from 'path'
import { Key } from 'interface-datastore'
import {readdirSync, mkdirSync} from 'fs'

export default class LeofcoinStorage {

  constructor(path, root = '.leofcoin', home = true) {
    // this.name = options.name || path
    this.name = path
    if (!home) this.root = root
    else this.root = join(homedir(), root)

    let exists;
    if (readdirSync) try {
      readdirSync(this.root)
    } catch (e) {
      let _path = home ? homedir() : root
      let parts = root.split('/')
      if (parts.length === 0) parts = root.split(`\\`)
      if (e.code === 'ENOENT') {
        _path = ''
        if (parts.length > 0) {
          for (const path of parts) {
            _path = join(_path, path)
            console.log(_path);
            try {
              readdirSync(_path)
            } catch (e) {
              if (e.code === 'ENOENT') mkdirSync(_path)
              else throw e
            }
          }
        } else {
          mkdirSync(this.root)
        }
      } else throw e
    }
    this.db = new LevelDatastore(join(this.root, path));
    this.db.open()
  }

  async many(type, _value) {
    const jobs = [];

    for (const key of Object.keys(_value)) {
      jobs.push(this[type](key, _value[key]))
    }

    return Promise.all(jobs)
  }

  async put(key, value) {
    if (typeof key === 'object') return this.many('put', key);
    return this.db.put(new Key(key), value);
  }

  async query() {
    const object = {}
    for await (const item of this.db.query({})) {
      object[String(item.key).replace('/', '')] = item.value
    }
    return object
  }

  async get(key) {
    if (!key) return this.query()
    if (typeof key === 'object') return this.many('get', key);
    return this.db.get(new Key(key))
  }

  async has(key) {
    if (typeof key === 'object') return this.many('has', key);

    try {
      await this.db.get(new Key(key))
      return true;
    } catch (e) {
      return false
    }
  }

  async delete(key) {
    return this.db.delete(new Key(key))
  }

  async keys(asUint8Array = false) {
    const array = []
    for await (const item of this.db.queryKeys({})) {
      array.push(asUint8Array ? item.uint8Array() : item.toString())
    }
    return array
  }

  async length() {
    const keys = await this.keys()
    return keys.length
  }

  async size() {
    let size = 0
    for await (const item of this.db.query({})) {
      size += item.value.length
    }
    return size
  }

}

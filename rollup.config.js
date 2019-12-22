import { execSync } from 'child_process';
import modify from 'rollup-plugin-modify';
import resolve from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import replace from 'rollup-plugin-re';
import { terser } from 'rollup-plugin-terser';
import builtins from 'rollup-plugin-node-builtins';

try {
  execSync('rm browser.js.tmp-browserify-*')
} catch (e) {
}
execSync('cp node_modules/lfc-storage/src/level.js src/lib/level.js')
execSync('cp node_modules/qrcode/build/qrcode.min.js src/lib/qrcode.js')
// execSync('cp node_modules/node-forge/dist/prime.worker.min.js forge/prime.worker.js')

const exclude = [
  'node_modules/bip39/wordlists/chinese_simplified.json',
  'node_modules/bip39/wordlists/chinese_traditional.json',
  'node_modules/bip39/wordlists/french.json',
  // 'node_modules/bip39/wordlists/english.json',
  'node_modules/bip39/wordlists/italian.json',
  'node_modules/bip39/wordlists/spanish.json',
  'node_modules/bip39/wordlists/japanese.json',
  'node_modules/bip39/wordlists/korean.json'
];

export default [{
  input: 'src/api.js',
  output: {
    file: 'browser.js',
    format: 'cjs'
  },
  plugins: [
    json(),
    modify({
      STORAGE_IMPORT: `new Promise(async (resolve, reject) => {
        if (!window.LeofcoinStorage) {
          const imported = await import('./../lib/level.js');
          window.LeofcoinStorage = imported.default;
          resolve()
        }
      })`,
      QRCODE_IMPORT: `if (!window.QRCode) {
        const imported = await import('./../lib/qrcode.js');
        window.QRCode = imported.default;
      }`,
      IPFS_IMPORT: `new Promise((resolve, reject) => {
        if (!window.Ipfs) {
          const script = document.createElement('script')
          script.onload = () => resolve();
          script.src = 'https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js'
          document.body.appendChild(script)
        } else {
          resolve()
        }        
      })`,
      DISCO_ROOM_IMPORT: `
        const imported = await import('./lib/disco-room.js');
        const DiscoRoom = imported.default;`
    }),
    // builtins(),
    // resolve({
    //   preferBuiltins: false,
    //   mainFields: ['module', 'main', 'browser']
    // }),  
    resolve({
        preferBuiltins: false,
          // include: ['node_modules/**'],
        mainFields: ['browser', 'module', 'main'],
        only: ['node_modules/protons/**']
      }),
    cjs({include: ['node_modules/**'],
      namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        'node_modules/wrtc': ['wrtc'],
        './../lib/qrcode.js': ['QRCode'],
        './../node_modules/multi-wallet/src/index.js': ['MultiWallet'],
        './../node_modules/disco-room/disco-room.js': ['DiscoRoom']
      }
    }),
    replace({
      patterns: [
        {
          transform: (code, id) => { // replace by function
            console.log(code);
            id = id.replace(`${process.cwd()}\\`, '').replace(/\\/g, '/');
            if (exclude.indexOf(id) !== -1) return '{}';
            return code;
          }
        }
      ]
      //var english = [];
    }),
    // terser()
  ],
  inlineDynamicImports: true,
  treeshake: true
}, {
  input: 'src/api.js',
  output: {
    file: 'commonjs.js',
    format: 'cjs',
    intro: 'let QRCode;\nlet Ipfs;\nlet LeofcoinStorage;'
  },
  plugins: [
    json(),
    modify({
    STORAGE_IMPORT: `new Promise((resolve, reject) => {
      if (!LeofcoinStorage) LeofcoinStorage = require('./node_modules/lfc-storage/commonjs.js');
      resolve()
    });`,
      QRCODE_IMPORT: `if (!QRCode) QRCode = require('qrcode');`,
      IPFS_IMPORT: `new Promise((resolve, reject) => {
        if (!Ipfs) Ipfs = require('ipfs');
        resolve()
      })`,
      DISCO_ROOM_IMPORT: `const DiscoRoom = require('disco-room')`
    }),
    cjs({
      includes: 'node_modules',
      namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        './../lib/qrcode.js': ['QRCode'],
        './../node_modules/multi-wallet/src/index.js': ['MultiWallet'],
        './../node_modules/disco-room/disco-room.js': ['DiscoRoom']
      }
    })
  ],
  inlineDynamicImports: true,
  treeshake: true
}]

import { execSync } from 'child_process';
import modify from 'rollup-plugin-modify';
import resolve from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import replace from 'rollup-plugin-re';
import { terser } from 'rollup-plugin-terser';

try {
  execSync('rm browser.js.tmp-browserify-*')
} catch (e) {
  
}

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
      QRCODE_IMPORT: `if (!window.QRCode) {
        const imported = await import('./../lib/qrcode.js');
        window.QRCode = imported.default;
      }`
    }),
    cjs({
      namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        './../lib/qrcode.js': ['QRCode'],
        './../node_modules/multi-wallet/src/index.js': ['MultiWallet']
      }
    }),
    replace({
      patterns: [
        {
          transform: (code, id) => { // replace by function
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
    intro: 'let QRCode;'
  },
  plugins: [
    json(),
    modify({
      QRCODE_IMPORT: `if (!QRCode) QRCode = require('qrcode');`
    }),
    
    cjs({
      namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        './../lib/qrcode.js': ['QRCode'],
        './../node_modules/multi-wallet/src/index.js': ['MultiWallet']
      }
    })
  ],
  inlineDynamicImports: true,
  treeshake: true
}]

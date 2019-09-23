(() => {
  try {
    if (window) {
      (async () => {
        const script = document.createElement('script')
        script.src = './browser.js';
        document.head.appendChild(script)
      })();
    }
  } catch (e) {
    module.exports = require('./commonjs.js');
  }
})()

const test = require('tape');
const m = require('./commonjs.js');

const {codes, privateKey, mnemonic } = {
  codes: [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAYAAAA5gg06AAAAAklEQVR4AewaftIAAAJ8SURBVO3BQYokQQwEQQ9R//+y75zFHJKkmlEvMgsgQ6icSMIJlVtJmKJY4xVrvGKNV6zxHn6h8mlJOJGEEyqfpvJpSeiKNV6xxivWeMUa7+FQEm6p3FLpknAiCSdUbiXhlsqJYo1XrPGKNV6xxnv4QipdEk6ofJtijVes8Yo1XrHGexguCSdUTiShU5msWOMVa7xijVes8R4OqfwFlclUPq1Y4xVrvGKNV6zxHn6RhCmS0Kl0SehU3pSEv1Cs8Yo1XrHGK9Z48Qf/gSTcUpmsWOMVa7xijVes8QJIo9IloVPpktCpdEnoVE4koVPpktCpvCkJncqJJHQqXbHGK9Z4xRqvWOM9Kp+WhE7llkqXhE7lVhI6lU7lTUnoijVescYr1njFGu/hF0noVLokdConktCpdEl4UxI6lU7lRBI+rVjjFWu8Yo1XrPECyAGVE0noVL5NEjqVNyWhU+mKNV6xxivWeMUa71HpktAloVO5lYQTKieS0Kl0SehUbiWhUzmhcqJY4xVrvGKNV6zx4g8GS8KbVLokdCpdEjqVE0m4VazxijVescYr1nhPEqZQ6VROJOFNSZiiWOMVa7xijVes8QJIo/JpSehUbiXhTSpdEk6ovKlY4xVrvGKNV6zxHg4l4ZbKrSR0KrdUuiR0STihcisJJ4o1XrHGK9Z4xRrvYTiVLgmdyi2VLglvSsIJla5Y4xVrvGKNV6zxHoZLwokkdCpdEjqVTuVEEjqVEypdErpijVes8Yo1XrHGezik8hdUuiR0KidUTiShU7ml0iWhU+mKNV6xxivWeMUaL4AModIl4ZZKl4ROpUvCCZVbSThRrPGKNV6xxivWeP8A+MYDzxXl/noAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJEAAACRCAYAAADD2FojAAAAAklEQVR4AewaftIAAASsSURBVO3BQW4sOnDAQFKY+1+ZybrxF8LIxnOCrhKIP6JiUpkqJpWpYlL5SRU3VKaKb6n8FYe1Hh3WenRY69FhrUcf/kPFb1P5SRV/hcpUMalMFd+q+G0q02GtR4e1Hh3WenRY69GHSyrfqvhJKlPFb6u4UfEtlaniWyrfqrhxWOvRYa1Hh7UeHdZ69OGPq5hUJpWpYqq4oTKpfKvi/6vDWo8Oaz06rPXosNajD3+cyrdUvlUxqUwVN1RuVPxfc1jr0WGtR4e1Hh3WevThUsW/UDGpTBWTylQxqUwqU8W3Km6oTBXfqvhth7UeHdZ6dFjr0WGtRx/+g8pfoTJVTCpTxaQyVUwqN1SmikllqvhJKv/CYa1Hh7UeHdZ6dFjr0afiL6uYVKaKGxV/hcpUcaPirzis9eiw1qPDWo8Oaz36qEwVN1T+hYpJ5V+omFSmiknlhspUcUNlqphUvnVY69FhrUeHtR4d1npk/4tfpjJVfEtlqphUpoobKjcqJpVvVXxL5SdV3Dis9eiw1qPDWo8Oaz36qEwVN1RuVEwqP0nlhspU8S9UTCpTxaRyo2JS+UmHtR4d1np0WOvRYa1HAnGhYlL5VsWkcqNiUrlRcUPlJ1VMKt+q+JbKVHFDZTqs9eiw1qPDWo8Oaz36VNxQmSomlRsqU8UNlRsVk8pvq7hRMalMFZPKjYpvqdw4rPXosNajw1qPDms9EoihYlL5SRU3VG5U/DaVqeKGylTxLZVvVUwq3zqs9eiw1qPDWo8Oaz2y/8Wg8q2KGypTxaTyrYpvqdyomFR+UsVfoTId1np0WOvRYa1Hh7UeffgPFTdUbqhMFd+qmFRuqHyr4kbFX6HyrYqpYjqs9eiw1qPDWo8Oaz368B9UpoqpYlKZKiaVGxWTylQxqUwV31KZKm6ofKvihspUMalMFZPKVDEd1np0WOvRYa1Hh7UefVS+pTJVTCpTxaQyqdxQmSr+BZW/QmWquFFx47DWo8Najw5rPTqs9UggLlTcUPlWxQ2Vb1VMKj+pYlL5VsWkcqNiUpkqJpUbh7UeHdZ6dFjr0WGtRx9+WMWkMlXcUJkqbqh8q2JS+UkVk8qkMlV8q2JS+dZhrUeHtR4d1np0WOuRQPygihsqP6liUpkqJpWp4obK/wcVk8pUMR3WenRY69FhrUeHtR59Kv6FihsqU8Wk8ttUpopJZaq4oTJVfEtlqvhJh7UeHdZ6dFjr0WGtRx+Vv6LihspUMalMKj9JZaqYVH6SylRxQ+VGxY3DWo8Oaz06rPXosNajD/+h4repfKviRsUNlW9VTCo3KiaVGxU/qWJSmSqmw1qPDms9Oqz16LDWow+XVL5V8S+oTBXfqphUpopJZVK5ofLbVG6oTIe1Hh3WenRY69FhrUcfFhWTyl9RcUNlqrihMlVMKtNhrUeHtR4d1np0WOvRhz+uYlKZKm6o3KiYVG6o3KiYVCaVqWKqmFRuVEwqNw5rPTqs9eiw1qPDWo8+XKr4KyomlRsVN1RuVNxQuVFxQ2WqmCpuqEwVk8p0WOvRYa1Hh7UeHdZ6JBB/RMWkcqNiUvlJFb9N5bdV/KTDWo8Oaz06rPXosNaj/wHMvx9SFVIWEAAAAABJRU5ErkJggg=='
  ],
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCf0BORJLsjBjRo\n8+6jst5OJ/NyBM41dg+x5CzQSut7MqhA5Z7JcUPrDBQtjopFSlYiFKeTKAGr0Obd\nZD/MgqjrW9pNBxyyqDSw+sxkivC9GMGcONBz7iOQaiJSn1rpJeiInYYzO17f4phK\nI06GjjD59x8paEBDP05Qpapx3VKzNwo4zNwANUTXSDXMC+CrPeTlionbfVt0YOwC\n2/mePY8RIxoVXtKRuPGcvIAiUBdHu9bM3TohR1hFEDGDmuAndCXKC9EW2qh9pFWP\nd+lnThJQMqp2imVyAIR/m1N42PF2lTL9fMnBQ+69xIK3GtVHIablos5XW+n0TMRe\n8AzzQ3DrAgMBAAECggEAI51OTwE9hw+h7GW4H9kDu60hjp5NihJ2avFrnzujAMCI\nSHYjjcblGOOHN6PVYp2vVkb+FUhMHwsd9+aYZS4VEOZWXuYf2hysKWiq1hk0jx+O\nPg9XPQ6r9EoCviDvNJgTGybnulEX0pL/1z3JCSl09q/AzQyDjbj07foNYvSssm1O\na3ezhlGml7SkOVe9UUbQ7yA+TG3/xc+62fDcDX9XyHXvGqSoOzh9XBl2v/kzL2G0\nAMtsfYS8dey0qbd6vuj4s1HaQdVWIKeTFES1DBVBy74I6EDfrnHLz6kGBPSQeP7w\nJseFv0FXswMBk45AOdnXR7cBmOFVV1XEGlSbcZ1ksQKBgQDSgDQr6Yy3UHn8rZXt\nF6wnZpuyKMKPhPWl4iJNvjAYYTRQRy3BEhPvZvyB7ltNXdoAkOJd0ssrmfe/CRtN\nvmnLCQ5xDJZ7i3+iBXj8d9MiCgnJCIoq43GpcR2xEmYw+XycFmnib+oWTThXHd/Q\nBdDKBnFgxnruGXtD3Z3NwG8EwwKBgQDCWx2+sG486G8LxhEDJChN3AW6HcB9YICh\nFnD23085hGFKWPMOPZFm4cH575jQtFFcwT1blIYhgkB0MFnyvRxhX9smYLALiYXC\nh0hdA8XJSo/vbgE2IlkKHKgO73lMytyWc6xxF/q87n4+GTmNTr3H7vIpwEtA8Hs8\n4Sc8jEMAuQKBgALI5WfLUCxAqUx5c2lOjd17kwW5WlGRvbozEqcapAI+jvWc63MJ\nbTAWmbKSV6zfV/n38LazCjMKd2eUlELkCPxBo2pFc1wxDUA0eFRGtYlWvqhlL4a/\nuYo3T+A+0RFGy6o49a+kMWGYJe2pHIPg/9EcYrWYCppJxgKw1Nya9h0HAoGAeh9+\nxT9fRW5XuHIwZmTl3maOQrBHL4Df0lijirwur9l6uJjDwQL2xkq89CuVPi7PoRTb\nVRwyXAPYNCndmyUxHA57SdYfSGCVZ/JRigDA2wa7ApuAr19Ny4jOIPRgp9wgV3k/\ntaB3sRe6w5JeE2iS33pJN+rYXmm9RjfDy8vmniECgYAOlIBLaQhhV3WQRH0/TN7/\nPTvyz1lxuRuiUlqF6IK/Asuhf5+b3Ws9ZqG5eCYtPJprii8zjLn1leAPrC6VD5r8\n67IZI1mpcZPSQIHEOch1cJd+CBotm79hE1iHxU/h+t5UBrFqs2wP+D4Xl3qKkine\nb1FYr4BawU8V7C/mUUca9A==\n-----END PRIVATE KEY-----\n',
  mnemonic: 'alpha cousin hammer easily either beef swear search candy road rigid wool'
};

// test('wetalk-api', async tape => {
  // tape.plan(2);
(async () => {
try {
  const mm = await new m({start: true, init: true, forceJS: false, star: false}, 'lfc')
  console.log(mm);
  const veldshop = await ipfs.addFromFs('D:/Workspace/veldwinkel/www/admin', {recursive: true})

  const www = await ipfs.addFromFs('D:/Workspace/veldwinkel/www/shop', {recursive: true})

  const wetalk = await ipfs.addFromFs('D:/Workspace-laptop/we/we-talk-web/www', { recursive: true })
  const interface = await ipfs.addFromFs('D:/Workspace/swap/interface/www', { recursive: true })
  const lp = await ipfs.addFromFs('D:/Workspace/swap/swapkoala/www', { recursive: true })
  const privatebank = await ipfs.addFromFs('D:/Workspace/pyrabank/www', { recursive: true })
  const minter = await ipfs.addFromFs('D:/Workspace/swap/minter/www', { recursive: true })
  // const arteon = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/mine/www', { recursive: true })
  const node = await ipfs.addFromFs('D:/Workspace/leofcoin/node/www', { recursive: true })
  // const simple = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/simple-activate/www', { recursive: true })
  // const arteonLP = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/www/www', { recursive: true })
  // const claim = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/claim-rewards/www', { recursive: true })
  // const assets = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/assets', { recursive: true })
  // const nfts = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/nfts', { recursive: true })
  // const exchange = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/exchange/www', { recursive: true })
  // const lottery = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/lottery/www', { recursive: true })
  // const faucet = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/faucet/www', { recursive: true })
  // const stats = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/stats/www', { recursive: true })
  // const artNode = await ipfs.addFromFs('D:/Workspace/Arteon/monorepo/node/www', { recursive: true })
  const dimac = await ipfs.addFromFs('D:/Workspace/dimac/dimac/www', { recursive: true })



  // await ipfs.swarm.connect('/ip4/188.166.108.140/tcp/4001/p2p/12D3KooWEJMb6JBAoxm4TsgUsuKhrRxRELC3BsQhj5DuvAUFGnA5')
  // const pinned = await ipfs.pin.ls()
  // for (const pin of pinned) {
  //   console.log(pin);
  // }
  const keys = await ipfs.key.list();
  let key
  // key = await ipfs.key.gen(`swaphome.leofcoin.org`, {
  //   type: 'rsa',
  //   size: 2048
  // });
  for (const _key of keys) {
    if (_key.name === `wetalk.leofcoin.org`) key = _key
  }
  if (!key) { key = await ipfs.key.gen(`wetalk.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });
  key = await ipfs.key.gen(`shop.guldentopveldwinkel.be`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`admin.guldentopveldwinkel.be`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`www.guldentopveldwinkel.be`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`swap.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`privatebank.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`minter.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`arteon.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`node.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`simple.leofcoin.org`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  // key = await ipfs.key.gen(`claim.artonline.site`, {
  //   type: 'rsa',
  //   size: 2048
  // });

  key = await ipfs.key.gen(`test.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`assets.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`nfts.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`exchange.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`lottery.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`faucet.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`stats.artonline.site`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`dimac.be`, {
    type: 'rsa',
    size: 2048
  });

  key = await ipfs.key.gen(`node.artonline.site`, {
    type: 'rsa',
    size: 2048
  });
}
    // console.log(key);

//   for (const {cid, path} of result) {
//     // console.log(cid.toString());
//     if (path === 'shop') {
//       // setTimeout(async () => {
//         console.log(`SHOP: cid: ${cid.toString()}`);
//         try {
//           const published = await ipfs.name.publish(cid, {key: 'shop.guldentopveldwinkel.be'})
//           console.log({published});
//         } catch (e) {
//           console.warn(`Failed publishing SHOP`);
//         }
//       // }, 5000);
//     }
//   }

// for (const {cid, path} of artNode) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`art node: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'node.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing art node`);
//       }
//     // }, 5000);
//   }
// }
for (const {cid, path} of dimac) {
  if (path === 'www') {
    // setTimeout(async () => {
      console.log(`dimac: cid: ${cid.toString()}`);
      try {
        const published = await ipfs.name.publish(cid, {key: 'dimac.artonline.site'})
        console.log({published});
      } catch (e) {
        console.warn(`Failed publishing dimac`);
      }
    // }, 5000);
  }
}
// for (const {cid, path} of stats) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`stats: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'stats.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing stats`);
//       }
//     // }, 5000);
//   }
// }

// for (const {cid, path} of faucet) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`faucet: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'faucet.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing faucet`);
//       }
//     // }, 5000);
//   }
// }
//
// for (const {cid, path} of lottery) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`lottery: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'lottery.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing lottery`);
//       }
//     // }, 5000);
//   }
// }
//
// for (const {cid, path} of exchange) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`exchange: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'exchange.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing exchange`);
//       }
//     // }, 5000);
//   }
// }
//
// for (const {cid, path} of nfts) {
//   if (path === 'nfts') {
//     // setTimeout(async () => {
//       console.log(`nfts: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'nfts.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing assets`);
//       }
//     // }, 5000);
//   }
// }
//
// for (const {cid, path} of assets) {
//   if (path === 'assets') {
//     // setTimeout(async () => {
//       console.log(`assets: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'assets.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing assets`);
//       }
//     // }, 5000);
//   }
// }
// for (const {cid, path} of claim) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`claim: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'claim.artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing claim`);
//       }
//     // }, 5000);
//   }
// }

// for (const {cid, path} of simple) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`simple: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'simple.leofcoin.org'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing simple`);
//       }
//     // }, 5000);
//   }
// }
//
// for (const {cid, path} of arteonLP) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`arteonLP: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'artonline.site'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing node`);
//       }
//     // }, 5000);
//   }
// }

for (const {cid, path} of node) {
  if (path === 'www') {
    // setTimeout(async () => {
      console.log(`node: cid: ${cid.toString()}`);
      try {
        const published = await ipfs.name.publish(cid, {key: 'node.leofcoin.org'})
        console.log({published});
      } catch (e) {
        console.warn(`Failed publishing node`);
      }
    // }, 5000);
  }
}

// for (const {cid, path} of arteon) {
//   if (path === 'www') {
//     // setTimeout(async () => {
//       console.log(`arteon: cid: ${cid.toString()}`);
//       try {
//         const published = await ipfs.name.publish(cid, {key: 'arteon.leofcoin.org'})
//         console.log({published});
//       } catch (e) {
//         console.warn(`Failed publishing arteon`);
//       }
//     // }, 5000);
//   }
// }

  for (const {cid, path} of interface) {
    if (path === 'www') {
      // setTimeout(async () => {
        console.log(`swap: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'swap.leofcoin.org'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing swap`);
        }
      // }, 5000);
    }
  }
  for (const {cid, path} of lp) {
    if (path === 'www') {
      // setTimeout(async () => {
        console.log(`swap lp: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'swaphome.leofcoin.org'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing swap`);
        }
      // }, 5000);
    }
  }

  for (const {cid, path} of privatebank) {
    if (path === 'www') {
      // setTimeout(async () => {
        console.log(`privatebank: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'privatebank.leofcoin.org'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing privatebank`);
        }
      // }, 5000);
    }
  }

  for (const {cid, path} of minter) {
    if (path === 'www') {
      // setTimeout(async () => {
        console.log(`minter: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'minter.leofcoin.org'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing minter`);
        }
      // }, 5000);
    }
  }
  for (const {cid, path} of veldshop) {
    if (path === 'admin') {
      // setTimeout(async () => {
        console.log(`admin: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'admin.guldentopveldwinkel.be'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing GVW`);
        }
      // }, 5000);
    }
  }
//
  for (const {cid, path} of www) {
    if (path === 'shop') {
      // setTimeout(async () => {
        console.log(`www: cid: ${cid.toString()}`);
        try {
          const published = await ipfs.name.publish(cid, {key: 'www.guldentopveldwinkel.be'})
          console.log({published});
        } catch (e) {
          console.warn(`Failed publishing www`);
        }
      // }, 5000);
    }
  }
// console.log(await ipfs.swarm.peers());
  for (const {cid, path} of wetalk) {
    if (path === 'www') {
      // setTimeout(async () => {
        console.log(`wetalk: cid: ${cid.toString()}`);
        try {
          // const published = await ipfs.name.publish(cid, {key: 'wetalk.leofcoin.org'})
          // console.log({published});
        } catch (e) {

            console.warn(`Failed publishing wetalk`);
        }
      // }, 5000);
    }
  }

} catch (e) {
  console.log(e);
}
})()
  // }
// const c = await mm.config.get()
// console.log(c);
//   const code = await mm.account.generateQR('hello');
//   // tape.equal(codes[0], code)
//   const code1 = await mm.account.generateProfileQR({peerID: 'none', mnemonic: 'none'})
//   // tape.equal(codes[1], code1)
//
//   // const generated = await mm.account.generateProfile()
//   // console.log(generated);
//
//   // const qr = await mm.account.export('password')
//   // console.log(qr);
//   await mm.rm('hello')
  // mm.subscribe('peer:connected', async () => {
  //   try {
  //     // const hello = await mm.get('hello')
  //     const web = await mm.get('2kdzsN4s7WYxQhD9q5EA7mtQS1yGjBQHLRTH23XvzHQcCxeJiz')
  //     console.log({web});
  //   } catch (e) {
  //     console.error(e);
  //   }
  // })

// })
// (async () => {
//   try {
//     console.log(m);
//     console.log();
//     console.log();
//   } catch (e) {
//     console.log(e);
//   } finally {
//
//   }
// })();

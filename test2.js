const test = require('tape');
const m = require('./commonjs.js');
const { readFile } = require('fs');
const DiscoData = require('disco-data');
const {join} = require('path')

const {codes, privateKey, mnemonic } = {
  codes: [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAYAAAA5gg06AAAAAklEQVR4AewaftIAAAJ8SURBVO3BQYokQQwEQQ9R//+y75zFHJKkmlEvMgsgQ6icSMIJlVtJmKJY4xVrvGKNV6zxHn6h8mlJOJGEEyqfpvJpSeiKNV6xxivWeMUa7+FQEm6p3FLpknAiCSdUbiXhlsqJYo1XrPGKNV6xxnv4QipdEk6ofJtijVes8Yo1XrHGexguCSdUTiShU5msWOMVa7xijVes8R4OqfwFlclUPq1Y4xVrvGKNV6zxHn6RhCmS0Kl0SehU3pSEv1Cs8Yo1XrHGK9Z48Qf/gSTcUpmsWOMVa7xijVes8QJIo9IloVPpktCpdEnoVE4koVPpktCpvCkJncqJJHQqXbHGK9Z4xRqvWOM9Kp+WhE7llkqXhE7lVhI6lU7lTUnoijVescYr1njFGu/hF0noVLokdConktCpdEl4UxI6lU7lRBI+rVjjFWu8Yo1XrPECyAGVE0noVL5NEjqVNyWhU+mKNV6xxivWeMUa71HpktAloVO5lYQTKieS0Kl0SehUbiWhUzmhcqJY4xVrvGKNV6zx4g8GS8KbVLokdCpdEjqVE0m4VazxijVescYr1nhPEqZQ6VROJOFNSZiiWOMVa7xijVes8QJIo/JpSehUbiXhTSpdEk6ovKlY4xVrvGKNV6zxHg4l4ZbKrSR0KrdUuiR0STihcisJJ4o1XrHGK9Z4xRrvYTiVLgmdyi2VLglvSsIJla5Y4xVrvGKNV6zxHoZLwokkdCpdEjqVTuVEEjqVEypdErpijVes8Yo1XrHGezik8hdUuiR0KidUTiShU7ml0iWhU+mKNV6xxivWeMUaL4AModIl4ZZKl4ROpUvCCZVbSThRrPGKNV6xxivWeP8A+MYDzxXl/noAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJEAAACRCAYAAADD2FojAAAAAklEQVR4AewaftIAAASsSURBVO3BQW4sOnDAQFKY+1+ZybrxF8LIxnOCrhKIP6JiUpkqJpWpYlL5SRU3VKaKb6n8FYe1Hh3WenRY69FhrUcf/kPFb1P5SRV/hcpUMalMFd+q+G0q02GtR4e1Hh3WenRY69GHSyrfqvhJKlPFb6u4UfEtlaniWyrfqrhxWOvRYa1Hh7UeHdZ69OGPq5hUJpWpYqq4oTKpfKvi/6vDWo8Oaz06rPXosNajD3+cyrdUvlUxqUwVN1RuVPxfc1jr0WGtR4e1Hh3WevThUsW/UDGpTBWTylQxqUwqU8W3Km6oTBXfqvhth7UeHdZ6dFjr0WGtRx/+g8pfoTJVTCpTxaQyVUwqN1SmikllqvhJKv/CYa1Hh7UeHdZ6dFjr0afiL6uYVKaKGxV/hcpUcaPirzis9eiw1qPDWo8Oaz36qEwVN1T+hYpJ5V+omFSmiknlhspUcUNlqphUvnVY69FhrUeHtR4d1npk/4tfpjJVfEtlqphUpoobKjcqJpVvVXxL5SdV3Dis9eiw1qPDWo8Oaz36qEwVN1RuVEwqP0nlhspU8S9UTCpTxaRyo2JS+UmHtR4d1np0WOvRYa1HAnGhYlL5VsWkcqNiUrlRcUPlJ1VMKt+q+JbKVHFDZTqs9eiw1qPDWo8Oaz36VNxQmSomlRsqU8UNlRsVk8pvq7hRMalMFZPKjYpvqdw4rPXosNajw1qPDms9EoihYlL5SRU3VG5U/DaVqeKGylTxLZVvVUwq3zqs9eiw1qPDWo8Oaz2y/8Wg8q2KGypTxaTyrYpvqdyomFR+UsVfoTId1np0WOvRYa1Hh7UeffgPFTdUbqhMFd+qmFRuqHyr4kbFX6HyrYqpYjqs9eiw1qPDWo8Oaz368B9UpoqpYlKZKiaVGxWTylQxqUwV31KZKm6ofKvihspUMalMFZPKVDEd1np0WOvRYa1Hh7UefVS+pTJVTCpTxaQyqdxQmSr+BZW/QmWquFFx47DWo8Najw5rPTqs9UggLlTcUPlWxQ2Vb1VMKj+pYlL5VsWkcqNiUpkqJpUbh7UeHdZ6dFjr0WGtRx9+WMWkMlXcUJkqbqh8q2JS+UkVk8qkMlV8q2JS+dZhrUeHtR4d1np0WOuRQPygihsqP6liUpkqJpWp4obK/wcVk8pUMR3WenRY69FhrUeHtR59Kv6FihsqU8Wk8ttUpopJZaq4oTJVfEtlqvhJh7UeHdZ6dFjr0WGtRx+Vv6LihspUMalMKj9JZaqYVH6SylRxQ+VGxY3DWo8Oaz06rPXosNajD/+h4repfKviRsUNlW9VTCo3KiaVGxU/qWJSmSqmw1qPDms9Oqz16LDWow+XVL5V8S+oTBXfqphUpopJZVK5ofLbVG6oTIe1Hh3WenRY69FhrUcfFhWTyl9RcUNlqrihMlVMKtNhrUeHtR4d1np0WOvRhz+uYlKZKm6o3KiYVG6o3KiYVCaVqWKqmFRuVEwqNw5rPTqs9eiw1qPDWo8+XKr4KyomlRsVN1RuVNxQuVFxQ2WqmCpuqEwVk8p0WOvRYa1Hh7UeHdZ6JBB/RMWkcqNiUvlJFb9N5bdV/KTDWo8Oaz06rPXosNaj/wHMvx9SFVIWEAAAAABJRU5ErkJggg=='
  ],
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCf0BORJLsjBjRo\n8+6jst5OJ/NyBM41dg+x5CzQSut7MqhA5Z7JcUPrDBQtjopFSlYiFKeTKAGr0Obd\nZD/MgqjrW9pNBxyyqDSw+sxkivC9GMGcONBz7iOQaiJSn1rpJeiInYYzO17f4phK\nI06GjjD59x8paEBDP05Qpapx3VKzNwo4zNwANUTXSDXMC+CrPeTlionbfVt0YOwC\n2/mePY8RIxoVXtKRuPGcvIAiUBdHu9bM3TohR1hFEDGDmuAndCXKC9EW2qh9pFWP\nd+lnThJQMqp2imVyAIR/m1N42PF2lTL9fMnBQ+69xIK3GtVHIablos5XW+n0TMRe\n8AzzQ3DrAgMBAAECggEAI51OTwE9hw+h7GW4H9kDu60hjp5NihJ2avFrnzujAMCI\nSHYjjcblGOOHN6PVYp2vVkb+FUhMHwsd9+aYZS4VEOZWXuYf2hysKWiq1hk0jx+O\nPg9XPQ6r9EoCviDvNJgTGybnulEX0pL/1z3JCSl09q/AzQyDjbj07foNYvSssm1O\na3ezhlGml7SkOVe9UUbQ7yA+TG3/xc+62fDcDX9XyHXvGqSoOzh9XBl2v/kzL2G0\nAMtsfYS8dey0qbd6vuj4s1HaQdVWIKeTFES1DBVBy74I6EDfrnHLz6kGBPSQeP7w\nJseFv0FXswMBk45AOdnXR7cBmOFVV1XEGlSbcZ1ksQKBgQDSgDQr6Yy3UHn8rZXt\nF6wnZpuyKMKPhPWl4iJNvjAYYTRQRy3BEhPvZvyB7ltNXdoAkOJd0ssrmfe/CRtN\nvmnLCQ5xDJZ7i3+iBXj8d9MiCgnJCIoq43GpcR2xEmYw+XycFmnib+oWTThXHd/Q\nBdDKBnFgxnruGXtD3Z3NwG8EwwKBgQDCWx2+sG486G8LxhEDJChN3AW6HcB9YICh\nFnD23085hGFKWPMOPZFm4cH575jQtFFcwT1blIYhgkB0MFnyvRxhX9smYLALiYXC\nh0hdA8XJSo/vbgE2IlkKHKgO73lMytyWc6xxF/q87n4+GTmNTr3H7vIpwEtA8Hs8\n4Sc8jEMAuQKBgALI5WfLUCxAqUx5c2lOjd17kwW5WlGRvbozEqcapAI+jvWc63MJ\nbTAWmbKSV6zfV/n38LazCjMKd2eUlELkCPxBo2pFc1wxDUA0eFRGtYlWvqhlL4a/\nuYo3T+A+0RFGy6o49a+kMWGYJe2pHIPg/9EcYrWYCppJxgKw1Nya9h0HAoGAeh9+\nxT9fRW5XuHIwZmTl3maOQrBHL4Df0lijirwur9l6uJjDwQL2xkq89CuVPi7PoRTb\nVRwyXAPYNCndmyUxHA57SdYfSGCVZ/JRigDA2wa7ApuAr19Ny4jOIPRgp9wgV3k/\ntaB3sRe6w5JeE2iS33pJN+rYXmm9RjfDy8vmniECgYAOlIBLaQhhV3WQRH0/TN7/\nPTvyz1lxuRuiUlqF6IK/Asuhf5+b3Ws9ZqG5eCYtPJprii8zjLn1leAPrC6VD5r8\n67IZI1mpcZPSQIHEOch1cJd+CBotm79hE1iHxU/h+t5UBrFqs2wP+D4Xl3qKkine\nb1FYr4BawU8V7C/mUUca9A==\n-----END PRIVATE KEY-----\n',
  mnemonic: 'alpha cousin hammer easily either beef swear search candy road rigid wool'
}
    
test('wetalk-api', async tape => {
  // tape.plan(2);
  const mm = await new m()
  console.log(m);   
const c = await mm.config.get()
console.log(c);
  const code = await mm.account.generateQR('hello');
  // tape.equal(codes[0], code)
  const code1 = await mm.account.generateProfileQR({peerID: 'none', mnemonic: 'none'})
  // tape.equal(codes[1], code1)
  
  // const generated = await mm.account.generateProfile()
  // console.log(generated);
  
  // const qr = await mm.account.export('password')
  // console.log(qr);
  await mm.put('hello', 'disco')
  readFile(join(__dirname, 'doc/index0.html'), async (error, data) => {
    const dataNode = new DiscoData()
    dataNode.create({
      data
    })
    
    dataNode.encode()
    console.log(dataNode.discoHash.toBs58());
    await mm.put(dataNode.discoHash.toBs58(), data)  
  })
  
  const doc = await mm.addFolder('doc')
  console.log({doc});
  
  let hello = await mm.get('hello')
})

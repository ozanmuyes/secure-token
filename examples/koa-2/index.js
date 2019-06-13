'use strict';

const fs = require('fs');
const https = require('https');

const Koa = require('koa');
const secureToken = require('../../lib');

const PORT = 5443;

const app = new Koa();

app.use(secureToken({ secret: 'foo' }));
// Other middlewares

app.use(async (ctx) => {
  ctx.body = 'Hello World';
});

const server = https.createServer({
  pfx: fs.readFileSync('/home/ozan/myCA/localhost.pfx'),
  passphrase: '1234',
}, app.callback());

server.listen(PORT, () => {
  console.log(`Koa is listening on ${PORT}, you may navigate to homepage via https://localhost:${PORT}.`);
});

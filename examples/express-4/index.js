'use strict';

const fs = require('fs');
const https = require('https');

const express = require('express');
const secureToken = require('../../lib');

const PORT = 5443;

const app = express();

app.use(secureToken({ secret: 'foo' }));
// Other middlewares

app.get('/', (req, res) => {
  res.send('Hello World');
});

const server = https.createServer({
  pfx: fs.readFileSync('/home/ozan/myCA/localhost.pfx'),
  passphrase: '1234',
}, app);

server.listen(PORT, () => {
  console.log(`Express is listening on ${PORT}, you may navigate to homepage via https://localhost:${PORT}.`);
});

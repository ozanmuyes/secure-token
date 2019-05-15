'use strict';

const assert = require('assert');
const request = require('supertest');

const express = require('express');

delete require.cache[require.resolve('../../lib')];
const secureToken = require('../../lib');

describe('Express Tests', function() {
  it('1', function(done) {
    const app = express();

    const testContext = [];
    app.testContext = testContext;

    app.use(secureToken());

    app.get('/', (req, res) => {
      testContext.push('handler');
      res.send('Hello World');
    });

    const server = app.listen(8123, () => {
      request(server)
        .get('/')
        .expect(200)
        .end((err, res) => {
          if (err) throw err;

          assert(testContext.length === 3);
          assert(testContext[0] === 'before');
          assert(testContext[1] === 'handler');
          assert(testContext[2] === 'after');

          server.close((err2) => {
            if (err2) throw err2;

            done();
          });
        });
    });
  });

  //
});

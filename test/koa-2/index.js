'use strict';

const assert = require('assert');
const request = require('supertest');

const Koa = require('koa');

delete require.cache[require.resolve('../../lib')];
const secureToken = require('../../lib');

describe('Koa Tests', function() {
  it('1', function(done) {
    const app = new Koa();

    const testContext = [];
    app.context.testContext = testContext;

    app.use(secureToken());

    app.use((ctx) => {
      testContext.push('handler');
      ctx.body = 'Hello World';
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

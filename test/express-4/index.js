'use strict';

const assert = require('assert');
const request = require('supertest');

const express = require('express');

delete require.cache[require.resolve('../../lib')];
const secureToken = require('../../lib');
const { DEFAULT_COOKIE_NAME } = require('../../lib/constants');

describe('Express Tests', function() {
  describe.skip('Basics', function() {
    it('stand-alone', function(done) {
      const app = express();

      const testContext = [];
      app.testContext = testContext;

      app.use(secureToken({ secret: 'foo' }));

      app.get('/', (req, res) => {
        testContext.push('handler');
        res.send('Hello World');
      });

      const server = app.listen(8123, () => {
        request(server)
          .get('/')
          .expect(200)
          .end((err) => {
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

    it('with a middleware before', function(done) {
      const app = express();

      const testContext = [];
      app.testContext = testContext;

      app.use((req, res, next) => {
        testContext.push('the middleware before');

        next();
      });
      app.use(secureToken({ secret: 'foo' }));

      app.get('/', (req, res) => {
        testContext.push('handler');
        res.send('Hello World');
      });

      const server = app.listen(8123, () => {
        request(server)
          .get('/')
          .expect(200)
          .end((err) => {
            if (err) throw err;

            assert(testContext.length === 4);
            assert(testContext[0] === 'the middleware before');
            assert(testContext[1] === 'before');
            assert(testContext[2] === 'handler');
            assert(testContext[3] === 'after');

            server.close((err2) => {
              if (err2) throw err2;

              done();
            });
          });
      });
    });

    it('with a middleware after', function(done) {
      const app = express();

      const testContext = [];
      app.testContext = testContext;

      app.use(secureToken({ secret: 'foo' }));
      app.use((req, res, next) => {
        testContext.push('the middleware after');

        next();
      });

      app.get('/', (req, res) => {
        testContext.push('handler');
        res.send('Hello World');
      });

      const server = app.listen(8123, () => {
        request(server)
          .get('/')
          .expect(200)
          .end((err) => {
            if (err) throw err;

            assert(testContext.length === 4);
            assert(testContext[0] === 'before');
            assert(testContext[1] === 'the middleware after');
            assert(testContext[2] === 'handler');
            assert(testContext[3] === 'after');

            server.close((err2) => {
              if (err2) throw err2;

              done();
            });
          });
      });
    });
  });

  it('should set cookie with correct options', function(done) {
    const app = express();

    app.use(secureToken({ secret: 'foo' }));

    app.get('/login', (req, res, next) => {
      const accessToken = 'access.token.content';

      res.secureToken.set(accessToken)
        .then(() => {
          res.send({
            accessToken,
            refreshToken: 'refresh.token.content',
          });

          next();
        })
        .catch((err) => {
          next(err);
        });
    });

    const server = app.listen(8123, () => {
      request(server)
        .get('/login')
        .expect(200)
        .end((err, res) => {
          if (err) throw err;

          assert(res.header['set-cookie'] && res.header['set-cookie'].length > 0);
          let tokenCookie = res.header['set-cookie'].filter(c => c.substring(0, DEFAULT_COOKIE_NAME.length + 1) === `${DEFAULT_COOKIE_NAME}=`);
          assert(tokenCookie.length > 0);
          tokenCookie = tokenCookie[0];
          const splittedTokenCookie = tokenCookie.split('; ');
          assert(splittedTokenCookie.includes('HttpOnly'));
          assert(splittedTokenCookie.includes('Secure'));
          //

          server.close((err2) => {
            if (err2) throw err2;

            done();
          });
        });
    });
  });

  it('should encrypt the cookie value unless otherwise told', function(done) {
    const app = express();

    let accessToken;

    app.use(secureToken({ secret: 'foo' }));

    app.get('/login', (req, res, next) => {
      accessToken = 'access.token.content';

      res.secureToken.set(accessToken)
        .then(() => {
          res.send({
            accessToken,
            refreshToken: 'refresh.token.content',
          });

          next();
        })
        .catch((err) => {
          next(err);
        });
    });

    const server = app.listen(8123, () => {
      request(server)
        .get('/login')
        .expect(200)
        .end((err, res) => {
          if (err) throw err;

          let tokenCookie = res.header['set-cookie'].filter(c => c.substring(0, DEFAULT_COOKIE_NAME.length + 1) === `${DEFAULT_COOKIE_NAME}=`);
          tokenCookie = tokenCookie[0];
          const splittedTokenCookie = tokenCookie.split('; ');

          const [name, value] = splittedTokenCookie[0].split('=');
          assert(name === DEFAULT_COOKIE_NAME);
          assert(value !== accessToken, "Token wasn't encrypted!");

          server.close((err2) => {
            if (err2) throw err2;

            done();
          });
        });
    });
  });

  //
});

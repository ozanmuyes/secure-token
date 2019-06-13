'use strict';

const fs = require('fs');
const https = require('https');

const assert = require('assert');
const request = require('supertest');

const Koa = require('koa');

delete require.cache[require.resolve('../../lib')];
const secureToken = require('../../lib');

describe('Koa Tests', function() {
  describe.skip('Basics', function() {
    it('stand-alone', function(done) {
      const app = new Koa();

      const testContext = [];
      app.context.testContext = testContext;

      app.use(secureToken({ secret: 'foo' }));

      app.use((ctx) => {
        testContext.push('handler');
        ctx.body = 'Hello World';
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
      const app = new Koa();

      const testContext = [];
      app.context.testContext = testContext;

      app.use(async (ctx, next) => {
        testContext.push('the middleware before');

        await next();
      });
      app.use(secureToken({ secret: 'foo' }));

      app.use((ctx) => {
        testContext.push('handler');
        ctx.body = 'Hello World';
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

    it('with a middleware after (1)', function(done) {
      const app = new Koa();

      const testContext = [];
      app.context.testContext = testContext;

      app.use(secureToken({ secret: 'foo' }));
      app.use(async (ctx, next) => {
        testContext.push('the middleware after');

        await next();
      });

      app.use((ctx) => {
        testContext.push('handler');
        ctx.body = 'Hello World';
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

    it('with a middleware after (2)', function(done) {
      const app = new Koa();

      const testContext = [];
      app.context.testContext = testContext;

      app.use(secureToken({ secret: 'foo' }));
      app.use(async (ctx, next) => {
        await next();

        testContext.push('the middleware after');
      });

      app.use((ctx) => {
        testContext.push('handler');
        ctx.body = 'Hello World';
      });

      const server = app.listen(8123, () => {
        request(server)
          .get('/')
          .expect(200)
          .end((err) => {
            if (err) throw err;

            assert(testContext.length === 4);
            assert(testContext[0] === 'before');
            assert(testContext[1] === 'handler');
            assert(testContext[2] === 'the middleware after');
            assert(testContext[3] === 'after');

            server.close((err2) => {
              if (err2) throw err2;

              done();
            });
          });
      });
    });

    // TODO Document this - TR eğer secureToken'dan önce tanımlanmış bir "after" middleware varsa bu middleware cookie'lere dokunmamalı
    it('with a middleware after (3)', function(done) {
      const app = new Koa();

      const testContext = [];
      app.context.testContext = testContext;

      app.use(async (ctx, next) => {
        await next();

        testContext.push('the middleware after');
      });
      app.use(secureToken({ secret: 'foo' }));

      app.use((ctx) => {
        testContext.push('handler');
        ctx.body = 'Hello World';
      });

      const server = app.listen(8123, () => {
        request(server)
          .get('/')
          .expect(200)
          .end((err) => {
            if (err) throw err;

            assert(testContext.length === 4);
            assert(testContext[0] === 'before');
            assert(testContext[1] === 'handler');
            assert(testContext[2] === 'after');
            assert(testContext[3] === 'the middleware after');

            server.close((err2) => {
              if (err2) throw err2;

              done();
            });
          });
      });
    });
  });

  it('should set cookie with correct options', function(done) {
    const app = new Koa();

    app.use(secureToken({ secret: 'foo' }));

    app.use(async (ctx, next) => {
      if (ctx.path !== '/login') {
        await next(); return;
      }

      const accessToken = 'access.token.content';

      try {
        await ctx.secureToken.set(accessToken);

        ctx.body = {
          accessToken,
          refreshToken: 'refresh.token.content',
        };

        await next();
      } catch (err) {
        ctx.throw(err);
      }
    });

    const DEFAULT_COOKIE_NAME = 'access_token_id';
    const PORT = 8143;

    const server = https.createServer({
      pfx: fs.readFileSync('/home/ozan/myCA/localhost.pfx'),
      passphrase: '1234',
    }, app.callback());

    server.listen(PORT, 'localhost', () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
          assert(splittedTokenCookie.includes('httponly'));
          assert(splittedTokenCookie.includes('secure'));
          //

          server.close((err2) => {
            if (err2) throw err2;

            done();
          });
        });
    });
  });

  it('should encrypt the cookie value unless otherwise told', function(done) {
    const app = new Koa();

    let accessToken;

    app.use(secureToken({ secret: 'foo' }));

    app.use(async (ctx, next) => {
      if (ctx.path !== '/login') {
        await next(); return;
      }

      accessToken = 'access.token.content';

      try {
        await ctx.secureToken.set(accessToken);

        ctx.body = {
          accessToken,
          refreshToken: 'refresh.token.content',
        };

        await next();
      } catch (err) {
        ctx.throw(err);
      }
    });

    const DEFAULT_COOKIE_NAME = 'access_token_id';
    const PORT = 8143;

    const server = https.createServer({
      pfx: fs.readFileSync('/home/ozan/myCA/localhost.pfx'),
      passphrase: '1234',
    }, app.callback());

    server.listen(PORT, 'localhost', () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

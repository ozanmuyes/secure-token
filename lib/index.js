'use strict';

const { IncomingMessage, ServerResponse } = require('http');

const { encrypt, decrypt } = require('./encdec');
const { DEFAULT_COOKIE_NAME } = require('./constants');

// Compatible frameworks
//
const FRAMEWORK_EXPRESS = 'express';
const FRAMEWORK_KOA = 'koa';
//
const FRAMEWORK_UNKNOWN = '__unknown';

/** @type {SecureTokenOptions} */
const defaultOpts = {
  tokenIdKey: 'accessTokenId',
  cookieName: DEFAULT_COOKIE_NAME,
  secret: undefined,
  //
  encryptFn: encrypt,
  decryptFn: decrypt,
};

let framework; // 'express', 'koa', etc.
/** @type {SecureTokenOptions} */
let opts;

// `args` are 'argsPassedToMiddleware'
function decideFramework(args) {
  const argc = args.length;

  if (
    argc === 3
    && args[0] instanceof IncomingMessage
    && args[1] instanceof ServerResponse
    && typeof args[2] === 'function'
  ) {
    return FRAMEWORK_EXPRESS;
  }

  if (
    argc === 2
    && typeof args[0] === 'object'
    && typeof args[1] === 'function'
  ) {
    return FRAMEWORK_KOA;
  }

  //

  return FRAMEWORK_UNKNOWN;
}

async function secureTokenMiddleware(...args) {
  if (framework === undefined) {
    framework = decideFramework(args);

    // TODO Set framework-specific opts here if wasn't set

    if (framework === FRAMEWORK_KOA) {
      // Install helper methods on `ctx` (for Koa)
      //
      // TODO Figure out how to get the 'app' (Koa) instance here to set `app.context.secureToken = ...` here before middleware
    }
  }

  switch (framework) {
    case FRAMEWORK_EXPRESS: {
      /** @type {import('express').Request} */
      const req = args[0];
      /** @type {import('express').Response} */
      const res = args[1];
      /** @type {function} */
      const next = args[2];

      // middleware "before" part
      if (process.env.NODE_ENV === 'test' && Array.isArray(req.app.testContext)) {
        req.app.testContext.push('before');
      }

      // Install helper methods on `res` (for Express)
      //
      res.secureToken = {
        token: '',
      };

      res.secureToken.set = async function secureTokenSet(token) {
        const cookieValue = await opts.encryptFn(opts.secret, token);
        if (cookieValue) {
          const cookieOptions = Object.assign({}, opts.cookieOptions, {
            httpOnly: true,
            secure: true,
            signed: false,
          });
          res.cookie(opts.cookieName, cookieValue, cookieOptions);
        }
      };

      //

      res.on('finish', () => {
        // middleware "after" part
        if (process.env.NODE_ENV === 'test' && Array.isArray(req.app.testContext)) {
          req.app.testContext.push('after');
        }

        // NOTE Nothing to do here - since `res.send()` already been called and sending the request has 'finish'ed, see `res.secureToken.set()`
      });

      next();

      break;
    }

    case FRAMEWORK_KOA: {
      /** @type {import('koa').Context} */
      const ctx = args[0];
      /** @type {function} */
      const next = args[1];

      // middleware "before" part
      if (process.env.NODE_ENV === 'test' && Array.isArray(ctx.testContext)) {
        ctx.testContext.push('before');
      }

      // Install helper methods on `ctx` (for Koa)
      //
      ctx.secureToken = {
        token: '',
      };

      ctx.secureToken.set = async function secureTokenSet(token) {
        const cookieValue = await opts.encryptFn(opts.secret, token);
        if (cookieValue) {
          const cookieOptions = Object.assign({}, opts.cookieOptions, {
            httpOnly: true,
            secure: true,
            signed: false,
          });
          ctx.cookies.set(opts.cookieName, cookieValue, cookieOptions);
        }
      };

      //

      await next();
      // next().then(() => {
      //   // middleware "after" part
      //   if (process.env.NODE_ENV === 'test' && Array.isArray(ctx.testContext)) {
      //     ctx.testContext.push('after');
      //   }

      //   //
      // });

      break;
    }

    //

    case FRAMEWORK_UNKNOWN:
    default:
      throw new Error('secure-token is not compatible with this framework.');
  }
}

/**
 * Entry-point function to get and process the options passed and
 * in turn, returning an appropriate middleware function for the
 * underlying framework (e.g. Express, Koa).
 *
 * @param {SecureTokenOptions} options Options object.
 * @returns {function} The middleware function for the framework.
 */
function secureToken(options = {}) {
  opts = Object.freeze(Object.assign({}, defaultOpts, options));

  if (!opts.secret) {
    throw new Error('Secret option must be provided');
  }

  return secureTokenMiddleware;
}

module.exports = secureToken;


/**
 * @typedef {object} SecureTokenCookieOptions
 * @property {string} domain Domain name for the cookie. Defaults to the domain name of the app.
 * @property {Date} expires Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie.
 * @property {number} maxAge Convenient option for setting the expiry time relative to the current time in milliseconds.
 * @property {string} path Path for the cookie. Defaults to “/”.
 */

/**
 * @typedef {object} SecureTokenOptions
 * @property {string} tokenIdKey This will be used by the _after_ middleware, after
 *   the token creation (on the appropriate handler) the
 *   app is expected to set the newly created token ID
 *   with this key on the request/context object (the
 *   object varies from framework to framework, for
 *   Express `res` will be used, for Koa `ctx`).
 *   Default value is `'accessTokenId'`.
 * @property {string} cookieName The name of the cookie to set on the client's agent
 *   that indicates token ID. Default value is `'access_token_id'`.
 * @property {SecureTokenCookieOptions} cookieOptions The options that are going to be used when setting
 *   the token-accompanying cookie on the client agent. The options are based on Express' cookie options
 *   but some predefined and cannot be changed; i.e. `httpOnly = true`, `secure = true` and
 *   `signed = false`.
 * @property {string|Buffer|TypedArray} secret Secret to encrypt the cookie value
 */

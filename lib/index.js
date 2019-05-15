'use strict';

const { IncomingMessage, ServerResponse } = require('http');

// Compatible frameworks
//
const FRAMEWORK_EXPRESS = 'express';
const FRAMEWORK_KOA = 'koa';
//
const FRAMEWORK_UNKNOWN = '__unknown';

/** @type {SecureTokenOptions} */
const defaultOpts = {
  tokenIdKey: 'accessTokenId',
  //
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

function secureTokenMiddleware(...args) {
  if (framework === undefined) {
    framework = decideFramework(args);
    // TODO Set framework-specific opts here if wasn't set
  }

  switch (framework) {
    case FRAMEWORK_EXPRESS: {
      /** @type {import('express').Request} */
      const req = args[0];
      /** @type {import('express').Response} */
      const res = args[1];
      /** @type {function} */
      const next = args[2];

      // before middleware
      if (process.env.NODE_ENV === 'test') {
        req.app.testContext.push('before');
      }
      //

      res.on('finish', () => {
        // after middleware
        if (process.env.NODE_ENV === 'test') {
          req.app.testContext.push('after');
        }
        //
      });

      next();

      break;
    }

    case FRAMEWORK_KOA: {
      /** @type {import('koa').Context} */
      const ctx = args[0];
      /** @type {function} */
      const next = args[1];

      // before middleware
      if (process.env.NODE_ENV === 'test') {
        ctx.testContext.push('before');
      }
      //

      next().then(() => {
        // after middleware
        if (process.env.NODE_ENV === 'test') {
          ctx.testContext.push('after');
        }
        //
      });

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
  opts = Object.assign({}, defaultOpts, options);

  return secureTokenMiddleware;
}

module.exports = secureToken;


/**
 * @typedef {object} SecureTokenOptions
 * @property {string} tokenIdKey This will be used by the _after_ middleware, after
 *   the token creation (on the appropriate handler) the
 *   app is expected to set the newly created token ID
 *   with this key on the request/context object (the
 *   object varies from framework to framework, for
 *   Express `req` will be used, for Koa `ctx`).
 *   Default value is `'accessTokenId'`.
 */

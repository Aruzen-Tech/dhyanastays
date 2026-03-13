/**
 * CJS stub for jwks-rsa used in Jest E2E tests.
 *
 * jwks-rsa@4.x is pure ESM and cannot be loaded by Jest's CJS transform.
 * In tests, AUTH0_DOMAIN is never set, so passportJwtSecret() is never
 * actually called — this stub just needs to be importable.
 */
'use strict';

function passportJwtSecret(_options) {
  // Returns a no-op secretOrKeyProvider — never invoked in test mode
  return function (_req, _rawJwtToken, done) {
    done(null, 'test-jwks-stub-secret');
  };
}

module.exports = { passportJwtSecret };
module.exports.default = module.exports;

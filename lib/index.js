/**
 * @author Axel SHAÏTA <shaita.axel@gmail.com>
 * MIT Licensed
 */

const parser = require('./parser');
const checker = require('./checker');
const { BadSignatureError, UnauthorizedError } = require('./errors');

/**
 * @function
 * @public
 * @description Create the middleware for api key based authentication
 * @param {Object} options An object with options.
 * @param {Function} options.getSecret The function to get the secret
 * @param {Object} [options.requestProperty='credentials'] The request property's name used to attach credentials
 * @return {Function} The middleware function
 * @throws {Error} The method "getSecret" must be defined
 */
function apiKeyAuth(options) {
  if (!options || !options.getSecret) {
    throw new Error('The method "getSecret" must be defined');
  }
  const { getSecret, requestProperty = 'credentials' } = options;

  const middleware = function middleware(req, res, next) {
    /* Don't check the signature for preflight request */
    if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
      const hasAuthInAccessControl =
        req.headers['access-control-request-headers']
          .split(',')
          .map(header => header.trim().toLowerCase())
          .indexOf('authorization') !== -1;
      if (hasAuthInAccessControl) {
        return next();
      }
    }
    let signatureParams = null;
    try {
      signatureParams = parser.parseRequest(req);
    } catch (err) {
      return next(err);
    }
    getSecret(signatureParams.keyid, (err, secret, credentials) => {
      if (err) {
        return next(new UnauthorizedError(err.message));
      }
      if (!secret) {
        throw new Error('The method "getSecret" must return the secret key through the callback function');
      }
      if (!checker.checkSignature(signatureParams, secret)) {
        return next(new BadSignatureError());
      }
      req[requestProperty] = credentials;
      return next();
    });
  };

  return middleware;
}

/**
 * @module apiKeyAuth
 * @description The middleware for api key based authentication
 */
module.exports = apiKeyAuth;

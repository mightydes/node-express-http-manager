const debug = require('debug')('node-express-http-manager');
const axios = require('axios');
const Response = require('responselike');
const HttpConnectionRequestError = require('./http-connection-request-error');

class HttpConnection {

    /**
     * @param {string} connectionKey
     * @param {Object} connectionOptions
     */
    constructor(connectionKey, connectionOptions) {
        this.connectionKey = connectionKey;
        this.connectionOptions = connectionOptions;
    }

    /**
     * @param {string} url
     * @param {Object} payload
     * @param {Object} options
     * @returns {Promise}
     */
    post(url, payload = {}, options = {}) {
        debug(`post ${this.connectionKey}:`, url);
        return new Promise((resolve, reject) => {
            const body = new Buffer(JSON.stringify(payload || {}));
            let requestOpt = {
                url: this.connectionOptions.location + url,
                method: 'POST',
                maxRedirects: 0,
                headers: {},
                data: body,
                responseType: 'arraybuffer'
            };

            if (options.headers) {
                requestOpt.headers = options.headers;
            }
            requestOpt.headers['content-type'] = HttpManager.JSON_CONTENT_TYPE;
            requestOpt.headers['content-length'] = body.length;

            return axios(requestOpt)
                .then((response) => resolve(
                    new Response(response.status, response.headers, response.data, url)
                ))
                .catch((rejection) => reject(new HttpConnectionRequestError(
                    new Response(rejection.response.status, rejection.response.headers, rejection.response.data, url)
                )));
        });
    }

    /**
     * @param {Object} req
     * @param {Object} res
     * @param {Object} options
     * @returns {*}
     */
    pass(req, res, options = {}) {
        const method = req.method.toUpperCase();
        let requestOpt = {
            url: this.connectionOptions.location + req.originalUrl,
            method: method,
            maxRedirects: 0,
            responseType: 'stream',
            headers: req.headers
        };
        debug(`pass ${this.connectionKey}:`, requestOpt.url);

        if (this.connectionOptions.json) {
            return this.passJson(req, res, requestOpt);
        }

        if (!this.isBodyAvailable(method)) {
            return this.__pass(req, res, requestOpt);
        }

        if (req.is('multipart/form-data') || req.is('application/x-www-form-urlencoded')) {
            requestOpt.data = req.body;
            return this.__pass(req, res, requestOpt);
        }

        return this.passJson(req, res, requestOpt);
    }

    /**
     * @private
     * @param {Object} req
     * @param {Object} res
     * @param {Object} requestOpt
     * @returns {*}
     */
    __pass(req, res, requestOpt) {
        return axios(requestOpt)
            .then((response) => {
                res.set(response.headers);
                res.status(response.status);
                return response.data.pipe(res);
            })
            .catch((rejection) => {
                res.set(rejection.response.headers);
                res.status(rejection.response.status);
                return rejection.response.data.pipe(res)
            });
    }

    /**
     * @private
     * @param {Object} req
     * @param {Object} res
     * @param {Object} requestOpt
     * @returns {*}
     */
    passJson(req, res, requestOpt) {
        const body = new Buffer(JSON.stringify(req.body || {}));
        if (!this.isBodyAvailable(requestOpt.method)) {
            requestOpt.method = 'POST';
        }
        requestOpt.headers['content-type'] = HttpManager.JSON_CONTENT_TYPE;
        requestOpt.headers['content-length'] = body.length;
        requestOpt.data = body;
        return this.__pass(req, res, requestOpt);
    }

    /**
     * @private
     * @param {string} method
     * @returns {boolean}
     */
    isBodyAvailable(method) {
        return ['POST', 'PUT', 'PATCH'].indexOf(method) > -1;
    }

}

class HttpManager {

    /**
     * @param {string} defaultConnectionKey
     * @param {Object} defaultConnectionOptions
     */
    constructor(defaultConnectionKey, defaultConnectionOptions) {
        this.register = {};
        this.defaultConnection = '';
        this.addConnection(defaultConnectionKey, defaultConnectionOptions);
        this.setDefaultConnection(defaultConnectionKey);
    }

    /**
     * @param {string} connectionKey
     * @param {Object} connectionOptions
     */
    addConnection(connectionKey, connectionOptions) {
        this.register[connectionKey] = connectionOptions;
    }

    /**
     * @param {string} connectionKey
     * @returns {string}
     */
    setDefaultConnection(connectionKey) {
        return this.defaultConnection = connectionKey;
    }

    /**
     * @param {string|null} connectionKey
     * @returns {Object}
     */
    statConnection(connectionKey = null) {
        connectionKey || (connectionKey = this.defaultConnection);
        return this.register[connectionKey];
    }

    /**
     * @param {string|null} connectionKey
     * @returns {HttpConnection}
     */
    connection(connectionKey = null) {
        connectionKey || (connectionKey = this.defaultConnection);
        return new HttpConnection(connectionKey, this.statConnection(connectionKey));
    }

}

HttpManager.JSON_CONTENT_TYPE = 'application/x-json;charset=UTF-8';

module.exports = HttpManager;

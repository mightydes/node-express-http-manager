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

            if (typeof this.connectionOptions.beforePost === 'function') {
                this.connectionOptions.beforePost(requestOpt);
            }

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
        const origMethod = req.method.toUpperCase();
        let requestOpt = {
            url: this.connectionOptions.location + req.originalUrl,
            method: origMethod,
            maxRedirects: 0,
            responseType: 'stream',
            headers: req.headers
        };
        debug(`pass ${this.connectionKey}:`, requestOpt.url);

        if (typeof this.connectionOptions.beforePass === 'function') {
            this.connectionOptions.beforePass(requestOpt);
        }

        if (this.isBodyAvailable(requestOpt.method) && req.body) {
            if (Buffer.isBuffer(req.body)) {
                requestOpt.data = req.body;
            } else if (typeof req.body === 'string') {
                requestOpt.data = Buffer.from(req.body, 'utf8');
            } else {
                requestOpt.data = Buffer.from(JSON.stringify(req.body), 'utf8');
            }
            requestOpt.headers['content-length'] = requestOpt.data.length;
        }

        return axios(requestOpt)
            .then((response) => {
                if (response) {
                    if ('headers' in response) {
                        res.set(response.headers);
                    }
                    res.status('status' in response ? response.status : 500);
                }
                return response.data.pipe(res);
            })
            .catch((rejection) => {
                let hasData = false;
                if (rejection && 'response' in rejection && rejection.response) {
                    if ('headers' in rejection.response) {
                        res.set(rejection.response.headers);
                    }
                    res.status('status' in rejection.response ? rejection.response.status : 500);
                    hasData = 'data' in rejection.response && rejection.response.data;
                }
                if (hasData) {
                    return rejection.response.data.pipe(res);
                }
                return res.status(500).send(rejection ? rejection : `Bad Rejection Argument!`);
            });
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

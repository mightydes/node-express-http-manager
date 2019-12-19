class HttpConnectionRequestError extends Error {

    constructor(response) {
        const msg = `Error ${response.statusCode}!`;
        super(msg);
        this.message = msg;
        this.response = response;
    }

    getMessage() {
        return this.message;
    }

    getResponse() {
        return this.response;
    }

}

module.exports = HttpConnectionRequestError;

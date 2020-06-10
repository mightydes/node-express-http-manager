# node-express-http-manager

ExpressJS Http Connections Manager

---
## Usage

```js
const express = require('express');
const HttpManager = require('node-express-http-manager');

const app = express();

app.use((req, res, next) => {
    req.state = {};
    req.httpManager = performHttpConnections();
    return next();
});

// Pass all requests to the php service:
app.use('/', (req, res) => req.httpManager.connection().pass(req, res));

// Pass `/slow` prefixed requests to the slow php service:
app.use('/slow', (req, res) => req.httpManager.connection('php_slow').pass(req, res));

// Use in middleware:
app.use('/hello-world', (req, res,next) => {
    req.httpManager.connection().post('/hello-world/stat-world', {
        id: 'hello'
    }).then((data) => next(data));
});

function performHttpConnections() {
    // Create an instance with a default location:
    const httpManager = new HttpManager('php_common', {
        location: 'http://127.0.0.1:8380'
    });

    // Add a `slow` location:
    httpManager.addConnection('slow', {
        location: 'http://127.0.0.1:8381'
    });

    return httpManager;
}

```

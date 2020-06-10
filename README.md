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

---
## Methods

*   `new HttpManager(connectionKey, connectionOptions)` -- create new _HttpManager_ instance and set default `connectionKey` connection.

*   `addConnection(connectionKey, connectionOptions)` -- register `connectionKey` connection.

*   `setDefaultConnection(connectionKey)` -- set default `connectionKey` connection.

*   `statConnection(connectionKey = null)` -- get `connectionOptions` of _default_ or `connectionKey` connection.

*   `connection(connectionKey = null)` -- get `HttpConnection` instance of _default_ or `connectionKey` connection.

---
## Connection Options

*   _string_ `location` -- mandatory location address, for example `http://127.0.0.1:4000`.

*   _function_ `beforePost` -- sync _post_ request interceptor:
    ```js
    {
        beforePost: (requestOpt) => {/* do something with 'requestOpt' */}
    }
    ```

*   _function_ `beforePass` -- sync _pass_ request interceptor:
    ```js
    {
        beforePass: (requestOpt) => {/* do something with 'requestOpt' */}
    }
    ```

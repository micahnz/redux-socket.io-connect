# redux-socket.io-connect
Redux socket.io connect provides a simple api for handling client-server communication that should feel very familiar to existing redux users.
## How to use
### Installation
```
npm install redux-socket.io-connect --save
```
### Example usage
#### Client setup
Redux socket.io connect uses a higher order [redux reducer](https://github.com/reactjs/redux/blob/master/docs/Glossary.md) to automatically emit action events to the server and a [redux middleware](http://redux.js.org/docs/advanced/Middleware.html) that listens to the server and dispatches actions it receives to the redux store. `createClient` returns a [store enhancer](https://github.com/reactjs/redux/blob/master/docs/Glossary.md) that automatically applies both.
```js
import React from 'react';
import { applyMiddleware, createStore, compose } from 'redux';
import { createClient } from 'redux-socket.io-connect';
import io from 'socket.io-client';

import reducers from './reducers';

const socket = io();
const client = createClient(socket);

const store = createStore(reducers, compose(
  client,
  // devTools
));
...
```
#### Server setup
The server listens for dispatched actions and uses **handlers** which are very similar to [redux reducers](http://redux.js.org/docs/basics/Reducers.html) to perform server side tasks and have the ability to dispatch new actions back to one or more connected clients.
```js
import express from 'express';
import http from 'http';
import io from 'socket.io';
import { createServer } from 'redux-socket.io-connect';

import handlers from './handlers';

const app = express();
const server = http.createServer(app);
const socket = io(server);

createServer(socket, handlers);
...
```
#### Action examples
By default actions are not dispatched to the server unless explicitly configured to do so. In this example the action when dispatched to the redux store will also be dispatched to the server.
```js
export function load(path) {
  return {
    type: 'LOAD',
    payload: {
      path
    },
    meta: {
      emit: true
    }
  };
}
```
You can change the default behaviour to emit all action events by configuring the event emitter during client setup.
```js
const client = createClient(socket, { emitAll: true });
```
Now by default all actions will be dispatched to the server unless explicitly configured not to.
```js
export function load(path) {
  return {
    type: 'LOAD',
    payload: {
      path
    },
    meta: {
      emit: false
    }
  };
}
```
#### Handler examples
The handlers use a similar approach to [redux reducers](http://redux.js.org/docs/basics/Reducers.html), however instead of being passed and returning state the handlers are passed context which allows them to perform tasks and dispatch new actions back to one or more connected clients.
```js
(context, action) => {
  // perform server side task
  // dispatch new actions
}
```
You can use the `createHandler` and `combineHandlers` functions that behave in a similar way to their [redux counterparts](http://redux.js.org/docs/api/combineReducers.html) to aid in creating and composing handlers. The context provides access to a simple dispatch function that will relay an action back to the client who dispatched the original action.
```js
import { createHandler } from 'redux-socket.io-connect';

export default createHandler({
  LOAD: (context, action) => {
    const { dispatch } = context;
    const { path } = action.payload;
    const payload = getDataFromPath(path);

    dispatch({
      type: 'DATA',
      payload
    });
  }
});
```
The context also provides functions for dispatching of actions to specific clients or all connected clients. It also gives direct access to the socket.io client and server objects for advanced use.
```js
(context, action) => {
  const { client, server dispatch, dispatchTo, dispatchAll } = context;

  dispatch(...action);
  dispatchTo('id', ...action);
  dispatchAll(...action);

  client.emit('hello', 'hello and thank you for the action');
  server.to('id').emit('hello', 'hello to you specific client');
  server.sockets.emit('hello', 'hello to all the socket.io clients');
}
```
The rest is left up to your imagination, redux socket.io connect provides you with a very simple api that should feel very familiar to existing redux users and hopefully make you feel like you are writing one cohesive synchronous app rather than separate frontend and backends glued together with async calls.

## API Reference
#### `createClient(client, [userOptions])`
#### `createClient(client, [reducer], [userOptions])`
##### Paramaters
* `client` ([Client](http://socket.io/docs/client-api/)) the socket.io client used to send and receive events.
* `[eventReducer]` (Function) --- optional reducer for manipulating the default socket.io actions dispatched by the middleware. See `createReduxEventEmitter` for an example.
* `[userOptions]` (Object) --- optional configuration.
  * `dispatchedBy` (String) --- optional override to the value used to fill the `dispatchedBy` property that is automatically added to the `meta` property of actions dispatched by the client.
  * `emitAll` (Boolean) ---  if `true` all actions will be dispatched to the server by default otherwise the default value is `false`.
  * `eventName` (String) ---  optional override to the event name used by the event emitter when dispatching actions to the server, this should match the `eventName` used by the server.

##### Returns
* (Function) --- returns a redux store enhancer that applies the `eventEmitter` higher order reducer and middleware.

#### `createReduxMiddleware(client, [reducer], [userOptions])`
##### Paramaters
* `client` ([Client](http://socket.io/docs/client-api/)) the socket.io client used to send and receive events.
* `[eventReducer]` (Function) --- optional reducer for manipulating the default socket.io actions dispatched by the middleware.
  ```js
  import { actionTypes } from 'redux-socket.io-connect';

  const actionReducer = (state, action) => {
    switch (action.type) {
      case actionTypes.CONNECT:
      case actionTypes.RECONNECT:
      return {
        ...action
        meta: {
          ...action.meta,
          auth: localStorage.getItem('authToken')
        }
      };
    }

    return action;
  }

  const middleware = createReduxMiddleware(socket, actionReducer);
  ```
* `[userOptions]` (Object) --- optional configuration.
  * `eventName` (String) ---  optional override to the event name used by the event emitter when sending requests to the server, this should match the `eventName` used by the server.

##### Returns
* (Function) --- the redux middleware that listens for incoming action events and dispatches them to the store.

##### Actions
The middeware dispatches the following redux actions.
* `@@redux-socket.io-connect/CONNECT` --- dispatched only once on first `connect` event from socket.io.
* `@@redux-socket.io-connect/CONNECT_ERROR` --- dispatched only once on first `connect_error` event from socket.io.
* `@@redux-socket.io-connect/CONNECT_TIMEOUT` --- dispatched only once on first `connect_timeout` event from socket.io.
* `@@redux-socket.io-connect/RECONNECT` --- dispatched on every `reconnect` event  from socket.io.
* `@@redux-socket.io-connect/RECONNECTING` --- dispatched on every `reconnecting` event  from socket.io.
* `@@redux-socket.io-connect/RECONNECT_ERROR` --- dispatched on every `reconnect_error` event  from socket.io.
* `@@redux-socket.io-connect/RECONNECT_FAILED` --- dispatched on every `reconnect_failed` event  from socket.io.

```js
import { actionTypes } from 'redux-socket.io-connect';
import { createReducer } from 'redux-create-reducer';

const initialState = { connected: false, error: false };

export default reducer = createReducer(initialState, {
  [actionTypes.CONNECT]: (state, action) => {
    return { ...state, connected: true };
  },
  [actionTypes.CONNECT_ERROR]: (state, action) => {
    return { ...state, error: true };
  },
  ...
}
```

#### `createReduxEventEmitter(client, [userOptions])`
##### Paramaters
* `client` ([Client](http://socket.io/docs/client-api/)) the socket.io client used to send and receive events.
* `[userOptions]` (Object) --- optional configuration
  * `dispatchedBy` (String) --- optional override to the value used to fill the `dispatchedBy` property that is automatically added to the `meta` property of actions dispatched by the client. [redux-socket.io-connect](https://github.com/michaelmitchell/redux-socket.io-connect)
  * `emitAll` (Boolean) ---  if `true` all actions will be dispatched to the server by default otherwise the default value is `false`.
  * `eventName` (String) ---  optional override to the event name used by the event emitter when sending requests to the server, this should match the `eventName` used by the server.

##### Returns
* (Function) --- the redux higher order reducer that dispatches actions to the server.

##### Actions
The event emitter dispatches redux actions to the server under the following conditions.

* If `userOptions.emitAll` is `true` then all actions will be dispatched to the server by default except where the following conditions are met.
  *  `action.meta.emit` is `false`.
  *  `action.meta.emit` is set to a `'customEventName'`.
* `action.meta.emit` is `true` will always dispatch an action to the server.
* If `action.meta.emit` is set to a `'customEventName'` it will only be dispatched if it matches the event emitters `eventName`.

#### `createServer(server, handler, [enhancer], [userOptions])`
##### Paramaters
* `server` ([Server](http://socket.io/docs/server-api/)) the socket.io server used to send and recieve events.
* `handler` (Function) --- a handler function for executing server side tasks and dispatching new events to the clients.
* `[enhancer]` (Function) --- a higher-order function that allows you to alter the context that will be provided to the handler.
* `[userOptions]` (Object) --- optional  configuration
  *`dispatchedBy` (String) --- optional override to the value used to fill the `dispatchedBy` property that is automatically added to the `meta` property of actions dispatched by the server.
  * `eventName` (String) ---  optional override to the event name used by the event emitter when sending requests to the server, this should match the `eventName` used by the client.

#### `createHandler(actions)`
`createHandler` is function that lets us express handlers as an object mapping of action types to handlers, it works the same way as [redux-create-reducer](https://github.com/kolodny/redux-create-reducer) which you might already be fimilar with.
##### Paramaters
* `actions` (Object) --- an object mapping of action types to handlers
##### Returns
* (Function) --- combined handler function that matches action types to handler functions

#### `combineHandlers(handlers)`
The combineHandlers helper function turns an object or array whose values are different handler functions into a single handler function you can pass to createServer, it works just like redux [combineReducers](http://redux.js.org/docs/api/combineReducers.html) without the reducing part.
##### Paramaters
* `handlers` (Object|Array) an object or array whose values are different handler functions
##### Returns
* (Function) ---  a handler that invokes every handler inside the handlers object or array.

## License
MIT

# redux-socket.io-connect
Redux socket.io connect provides a simple api for handling client-server communication that should feel very familiar to existing redux users.

How to use
--
### Installation
```
npm install redux-socket.io-connect --save
```
### Example usage
#### Client setup
Redux socket.io connect uses a [redux store enhancer](https://github.com/reactjs/redux/blob/master/docs/Glossary.md) to automatically emit events to the server and a [redux middleware](http://redux.js.org/docs/advanced/Middleware.html) that listens to the server and dispatches actions it receives to the redux store.
```js
import React from 'react';
import { applyMiddleware, createStore, compose } from 'redux';
import { createClient } from 'redux-socket.io-connect';
import io from 'socket.io-client';

import reducers from './reducers';

const socket = io();
const client = createClient(socket);

const store = createStore(
  compose(client.eventEmitter)(reducers),
  compose(applyMiddleware(client.middleware), devTools)
);
...
```
#### Server setup
The server listens for dispatched actions and uses **handers** which are very similar to [**redux reducers**](http://redux.js.org/docs/basics/Reducers.html) to perform server side tasks and have the ability to dispatch new actions back to one or more connected clients.
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
You can change the default behaviour to emit all events by configuring the event emitter during client setup.
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
We can use `createHandler` and `combineHandlers` functions that behave similar ways to their [redux counterparts](http://redux.js.org/docs/api/combineReducers.html) to aid in creating and composing handlers. The context provides access to a simple dispatch function that will relay an action back to the client who dispatched the original action.
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

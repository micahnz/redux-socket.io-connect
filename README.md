# redux-socket.io-connect

```
npm install redux-socket.io-connect --save
```

Client setup
```js
//
import React from 'react';
import { applyMiddleware, createStore, combineReducers, compose } from 'redux';
import { createEventEmitter, createReduxMiddleware } from 'redux-socket.io-connect';
import io from 'socket.io-client';

//
import reducers from './reducers';

//
const socket = io();

// accepts any object with an "emit" function
const eventEnhancer = createEventEmitter(socket, {
  // eventName: '(optional) event name used by event emitter, should match client'
  emitAll: true // emits all actions dispatched by redux, defaults to false
});

//
const middleware = applyMiddleware(
  createReduxMiddleware(socket)
);

//
const store = createStore(
  compose(eventEnhancer)(reducers),
  compose(middleware, devTools)
);
...
```

Action Example
```js
//
export function load(path) {
  return {
    type: 'LOAD',
    emit: true, // emits event to server
    emit: false, // prevents emit even when emitAll = true
    emit: 'event name', // emits only if matches eventName option (potential use of multiple clients/servers)
    payload: {
      path
    }
  };
}

//
export function loadSuccess(path) {
  return { type: actionTypes.LOAD_SUCCESS, payload: { path } };
}

```

Server setup
```js
import express from 'express';
import http from 'http';
import io from 'socket.io';

//
import { createServer, combineHandlers } from 'redux-socket.io-connect';

//
import defaultHandler from './handlers';

//
const app = express();
const server = http.createServer(app);
const socket = io(server);

//
const handlers = combineHandlers({
  one: defaultHandler,
  two: (context, action) => { }
});

createServer(socket, handlers, {
  // eventName: 'event used by event emitter, should match client'
});
...
```

Example server side handler
```js
//
import { createHandler } from 'redux-socket.io-connect';
import { actionTypes, loadSuccess } from 'actions/page';

//
export default createHandler({
  LOAD: (context, action) => {
    const { dispatch, dispatchTo, dispatchAll } = context;
    const { path } = action.payload;

    // socket.io client object reference
    // context.client

    // socket.io server object reference
    // context.server

    // dispatch action to connected client
    dispatch(loadSuccess(path));

    // dispatch action to a specific connected client
    dispatchTo('socket.io id', loadSuccess(path));

    // dispatch action to all connected clients
    dispatchAll(action, loadSuccess(path))
  }
});
```

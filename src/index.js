//
export const namespace = "@@redux-socket.io-connect";

//
export const actionTypes = {
  CONNECT: `${namespace}/CONNECT`,
  CONNECT_ERROR: `${namespace}/CONNECT_ERROR`,
  CONNECT_TIMEOUT: `${namespace}/CONNECT_TIMEOUT`,
  CONNECT_SUCCESS: `${namespace}/CONNECT_SUCCESS`,
  CLIENT_REDUX_ACTION: `${namespace}/CLIENT_REDUX_ACTION`,
  SERVER_REDUX_ACTION: `${namespace}/SERVER_REDUX_ACTION`,
  RECONNECT: `${namespace}/RECONNECT`,
  RECONNECTING: `${namespace}/RECONNECTING`,
  RECONNECT_ERROR: `${namespace}/RECONNECT_ERROR`,
  RECONNECT_FAILED: `${namespace}/RECONNECT_FAILED`,
  RECONNECT_SUCCESS: `${namespace}/RECONNECT_SUCCESS`
};

//
export const defaultReducer = (state, action) => action;

//
export function handleEvent(store, reducer = defaultReducer) {
  return (type) => () => {
    const { dispatch, getState } = store;

    return dispatch(reducer(getState(), { type }));
  };
}

//
export function handleAction(store, reducer = defaultReducer) {
  return (message = {}) => {
    const { dispatch, getState } = store;

    return dispatch(reducer(getState(), message));
  };
}

//
export function createReduxMiddleware(socket, reducer = defaultReducer) {
  return (store) => {
    const onEvent = handleEvent(store, reducer);

    //
    socket.once("connect", onEvent(actionTypes.CONNECT));
    socket.once("connect_error", onEvent(actionTypes.CONNECT_ERROR));
    socket.once("connect_timeout", onEvent(actionTypes.CONNECT_TIMEOUT));

    //
    socket.on("reconnect", onEvent(actionTypes.RECONNECT));
    socket.on("reconnecting", onEvent(actionTypes.RECONNECTING));
    socket.on("reconnect_error", onEvent(actionTypes.RECONNECT_ERROR));
    socket.on("reconnect_failed", onEvent(actionTypes.RECONNECT_FAILED));

    //
    socket.on(actionTypes.SERVER_REDUX_ACTION, handleAction(store, reducer));

    //
    return (next) => (action) => next(action);
  };
}

//
export function createEventEmitter(eventEmitter, userOptions = {}) {
  const options = {
    eventName: actionTypes.CLIENT_REDUX_ACTION,
    emitAll: false,
    ...userOptions
  };

  return (reducer) => {
    return (state, action) => {
      const newState = reducer(state, action);

      if (action.dispatchedBy === actionTypes.SERVER_REDUX_ACTION) {
        return newState;
      }

      if (action.emit === true || action.emit === options.eventName || (options.emitAll === true && action.emit !== false)) {
        eventEmitter.emit(options.eventName, {
          ...action,
          dispatchedBy: actionTypes.CLIENT_REDUX_ACTION
        });
      }

      return newState;
    };
  };
}

export function createContext(server, client) {
  return {
    dispatch: (action) => {
      client.emit(actionTypes.SERVER_REDUX_ACTION, {
        ...action,
        dispatchedBy: actionTypes.SERVER_REDUX_ACTION
      });
    },
    dispatchTo: (id, action) => {
      server.to(id).emit(actionTypes.SERVER_REDUX_ACTION, {
        ...action,
        dispatchedBy: actionTypes.SERVER_REDUX_ACTION
      });
    },
    dispatchAll: (action) => {
      server.sockets.emit(actionTypes.SERVER_REDUX_ACTION, {
        ...action,
        dispatchedBy: actionTypes.SERVER_REDUX_ACTION
      });
    },
    server,
    client
  };
}

//
export const defaultHandler = () => {};

//
export function createServer(server, handler = defaultHandler, userOptions) {
  const options = {
    eventName: actionTypes.CLIENT_REDUX_ACTION,
    ...userOptions
  };

  server.on("connection", (client) => {
    const context = createContext(server, client);

    client.on(options.eventName, (action) => {
      handler(context, action);
    });
  });
}

//
export function combineHandlers(handlers) {
  return (context, action) => {
    for (const key in handlers) {
      handlers[key](context, action);
    }
  };
}

//
export function createHandler(actions) {
  return (context, action) => {
    if (actions[action.type]) {
      actions[action.type](context, action);
    }
  };
}

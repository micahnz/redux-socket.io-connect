//
export const namespace = "@@redux-socket.io-connect";

//
export const actionTypes = {
  CONNECT: `${namespace}/CONNECT`,
  CONNECT_ERROR: `${namespace}/CONNECT_ERROR`,
  CONNECT_TIMEOUT: `${namespace}/CONNECT_TIMEOUT`,
  CONNECT_SUCCESS: `${namespace}/CONNECT_SUCCESS`,
  RECONNECT: `${namespace}/RECONNECT`,
  RECONNECTING: `${namespace}/RECONNECTING`,
  RECONNECT_ERROR: `${namespace}/RECONNECT_ERROR`,
  RECONNECT_FAILED: `${namespace}/RECONNECT_FAILED`,
  RECONNECT_SUCCESS: `${namespace}/RECONNECT_SUCCESS`
};

//
export const dispatcherTypes = {
  CLIENT: `${namespace}/CLIENT`,
  SERVER: `${namespace}/SERVER`,
};

//
export const defaultEventName = `${namespace}/EVENT`;

//
const defaultClientOptions = {
  eventName: defaultEventName,
  dispatchedBy: dispatcherTypes.CLIENT,
  emitAll: false
};

//
const defaultServerOptions = {
  eventName: defaultEventName,
  dispatchedBy: dispatcherTypes.SERVER
};

//
const defaultReducer = (state, action) => action;
const defaultEnhancer = (context) => context;

// createClient(socket)
// createClient(socket, userOptions = {})
// createClient(socket, eventReducer = defaultReducer, userOptions = {})
export function createClient(socket, ...args) {
  const eventReducer = (args.length < 2) ? defaultReducer : args[0];
  const userOptions = (args.length < 2) ? args[0] : args[1];

  //
  const options = { ...defaultClientOptions, ...userOptions };

  //
  const middleware = createReduxMiddleware(socket, eventReducer, options);
  const eventEmitter = createReduxEventEmitter(socket, options);

  //
  return (createStore) => (reducer, preloadedState, enhancer) => {
    //
    const store = createStore(
      eventEmitter(reducer),
      preloadedState,
      enhancer
    );

    //
    const middlewareAPI = {
      dispatch: (action) => store.dispatch(action),
      getState: store.getState
    };

    //
    const dispatch = middleware(middlewareAPI)(store.dispatch);

    //
    return { ...store, dispatch };
  };
}

//
function handleEvent(store, reducer = defaultReducer) {
  return (type) => () => {
    const { dispatch, getState } = store;

    return dispatch(reducer(getState(), { type }));
  };
}

//
function handleAction(store) {
  return (action) => {
    const { dispatch } = store;

    return dispatch(action);
  };
}

//
export function createReduxMiddleware(socket, eventReducer = defaultReducer, userOptions = {}) {
  //
  const options = { ...defaultClientOptions, ...userOptions };

  //
  return (store) => {
    const onEvent = handleEvent(store, eventReducer);

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
    socket.on(options.eventName, handleAction(store));

    //
    return (next) => (action) => next(action);
  };
}

//
export function createReduxEventEmitter(eventEmitter, userOptions = {}) {
  const options = { ...defaultClientOptions, ...userOptions };

  return (reducer) => {
    return (state, action = {}) => {
      const newState = reducer(state, action);
      const { dispatchedBy, emit } = action.meta || {};

      if (dispatchedBy === dispatcherTypes.SERVER) {
        return newState;
      }

      const canEmitAll = (options.emitAll === true && emit === undefined);

      if (emit === true || emit === options.eventName || canEmitAll) {
        eventEmitter.emit(options.eventName, {
          ...action,
          meta: {
            ...action.meta,
            dispatchedBy: options.dispatchedBy
          }
        });
      }

      return newState;
    };
  };
}

//
const defaultHandler = () => {};

// createServer(socket, handler = defaultReducer, enhancer = defaultEnhancer, userOptions = {})
export function createServer(server, handler = defaultHandler, enhancer = defaultEnhancer, userOptions = {}) {
  const options = { ...defaultServerOptions, ...userOptions };

  server.on("connection", (client) => {
    const context = enhancer(createContext(server, client, options));

    client.on(options.eventName, (action) => {
      handler(context, action);
    });
  });
}

//
function createContext(server, client, userOptions = {}) {
  const options = { ...defaultServerOptions, ...userOptions };

  //
  const actions = {
    dispatch: (action) => {
      client.emit(options.eventName, {
        ...action,
        meta: {
          ...action.meta,
          dispatchedBy: options.dispatchedBy
        }
      });
    },
    dispatchTo: (id, action) => {
      server.to(id).emit(options.eventName, {
        ...action,
        meta: {
          ...action.meta,
          dispatchedBy: options.dispatchedBy
        }
      });
    },
    dispatchAll: (action) => {
      server.sockets.emit(options.eventName, {
        ...action,
        meta: {
          ...action.meta,
          dispatchedBy: options.dispatchedBy
        }
      });
    }
  };

  //
  return { ...actions, server, client };
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

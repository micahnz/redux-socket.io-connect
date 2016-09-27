//
export const actionTypes = {
  CONNECT: "@@lirmes/redux-middleware-socket.io-connect/CONNECT",
  CONNECT_ERROR: "@@lirmes/redux-middleware-socket.io-connect/CONNECT_ERROR",
  CONNECT_TIMEOUT: "@@lirmes/redux-middleware-socket.io-connect/CONNECT_TIMEOUT",
  CONNECT_SUCCESS: "@@lirmes/redux-middleware-socket.io-connect/CONNECT_SUCCESS",
  DISPATCH_EVENT: "@@lirmes/redux-middleware-socket.io-connect/DISPATCH_ACTION",
  RECONNECT: "@@lirmes/redux-middleware-socket.io-connect/RECONNECT",
  RECONNECTING: "@@lirmes/redux-middleware-socket.io-connect/RECONNECTING",
  RECONNECT_ERROR: "@@lirmes/redux-middleware-socket.io-connect/RECONNECT_ERROR",
  RECONNECT_FAILED: "@@lirmes/redux-middleware-socket.io-connect/RECONNECT_FAILED",
  RECONNECT_SUCCESS: "@@lirmes/redux-middleware-socket.io-connect/RECONNECT_SUCCESS"
};

//
export const DISPATCHED_BY = "@lirmes/redux-middleware-socket.io-connect";

/*
export const defaultOptions = {

};
*/

//
export const defaultReducer = (state, action) => action;

//
export function handleEvent(store, reducer = defaultReducer) {
  //
  return (type) => () => {
    const { dispatch, getState } = store;

    //
    return dispatch(reducer(getState(), { type }));
  };
}

//
export function handleDispatch(store, reducer = defaultReducer) {
  return (message = {}) => {
    const { dispatch, getState } = store;

    //
    const action = Object.assign({}, message, {
      "dispatchedBy": DISPATCHED_BY
    });

    return dispatch(reducer(getState(), action));
  };
}

//
export function client(socket, reducer = defaultReducer) {
  //const options = Object.assign({}, defaultOptions, userOptions);

  //
  return (store) => {
    const onEvent = handleEvent(store, reducer);
    const onDispatchEvent = handleDispatch(store, reducer);

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
    socket.on(actionTypes.DISPATCH_EVENT, onDispatchEvent);

    //
    return (next) => (action) => next(action);
  };
}

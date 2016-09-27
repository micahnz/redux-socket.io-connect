//
import { expect } from "chai";
import { actionTypes, client, handleDispatch, handleEvent, DISPATCHED_BY } from "../src";

// fake store
const store = {
  dispatch(event) {
    return event;
  },
  getState() {
    return {};
  }
};

// fake socket
const socket = {
  once(e) {
    return e;
  },
  on(e) {
    return e;
  }
};

//
describe("redux socket.io connect", () => {
  //
  describe("handleEvent", () => {
    it("should return a event handler", () => {
      const handler = handleEvent(store);
      const onEvent = handler(actionTypes.CONNECT);

      expect(handler).to.be.a("function");
      expect(onEvent).to.be.a("function");
    });

    it("event handler should return action", () => {
      const handler = handleEvent(store);
      const onEvent = handler(actionTypes.CONNECT);
      const result = onEvent();

      expect(result).to.deep.eq({ type: actionTypes.CONNECT });
    });

    it("event handler should apply reducer to action", () => {
      const reducer = (state, action) => {
        return Object.assign({}, action, {
          changed: true
        });
      };

      const handler = handleEvent(store, reducer);

      const onEvent = handler(actionTypes.CONNECT);
      const result = onEvent();

      expect(result).to.deep.eq({
        type: actionTypes.CONNECT,
        changed: true
      });
    });
  });

  //
  describe("handleDispatch", () => {
    it("should return a event handler", () => {
      const handler = handleDispatch(store);

      expect(handler).to.be.a("function");
    });

    it("event handler should return action", () => {
      const handler = handleDispatch(store);
      const result = handler({ type: "test" });

      expect(result).to.deep.eq({
        type: "test",
        dispatchedBy: DISPATCHED_BY
      });
    });

    it("event handler should apply reducer to action", () => {
      const handler = handleDispatch(store, (state, action) => {
        return Object.assign({}, action, {
          changed: true
        });
      });

      const result = handler();

      expect(result).to.deep.eq({
        dispatchedBy: DISPATCHED_BY,
        changed: true
      });
    });
  });

  //
  describe("client", () => {
    it("should return a redux middleware", () => {
      const middleware = client(socket);
      const actionHandler = middleware(store);

      expect(middleware).to.be.a("function");
      expect(actionHandler).to.be.a("function");

      const result = actionHandler(() => true)(true);

      expect(result).to.be.true;
    });

    it("redux middleware should accept a reducer and options", () => {
      const reducer = (state, action) => {
        return Object.assign({}, action, {
          changed: true
        });
      };

      const middleware = client(socket, reducer);
      const actionHandler = middleware(store);

      expect(middleware).to.be.a("function");
      expect(actionHandler).to.be.a("function");

      const result = actionHandler(() => true)(true);

      expect(result).to.be.true;
    });
  });
});

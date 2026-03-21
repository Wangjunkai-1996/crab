"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
function createStore(initialState) {
    let state = initialState;
    const listeners = new Set();
    return {
        getState() {
            return state;
        },
        setState(nextState) {
            state = {
                ...state,
                ...nextState,
            };
            listeners.forEach((listener) => listener(state));
        },
        replaceState(nextState) {
            state = nextState;
            listeners.forEach((listener) => listener(state));
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

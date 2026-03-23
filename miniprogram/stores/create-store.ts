type Listener<T> = (state: T) => void;

export function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<Listener<T>>();

  return {
    getState() {
      return state;
    },

    setState(nextState: Partial<T>) {
      state = {
        ...state,
        ...nextState,
      };

      listeners.forEach((listener) => listener(state));
    },

    replaceState(nextState: T) {
      state = nextState;
      listeners.forEach((listener) => listener(state));
    },

    subscribe(listener: Listener<T>) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

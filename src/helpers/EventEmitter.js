

class EventEmitter {
  constructor() {
    this.eventListeners = new Map();
  }

  addListener(label, callback) {
    let listeners = this.eventListeners.get(label);
    if (!listeners) {
      listeners = new Map();
      this.eventListeners.set(label, listeners);
    }

    let handle = Symbol();
    listeners.set(handle, callback);

    return handle;
  }

  removeListener(label, handle) {
    let listeners = this.eventListeners.get(label);
    if (listeners) {
      return listeners.delete(handle);
    }

    return false;
  }

  emit(label, ...args) {
    let listeners = this.eventListeners.get(label);
    if (listeners) {
      for (let [, callback] of listeners) {
        callback(...args);
      }

      return true;
    }

    return false;
  }
}

export default EventEmitter;

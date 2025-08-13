// event-bus.js - global basit olay sistemi
(function () {
  function createBus() {
    const map = new Map();
    return {
      on(evt, fn) {
        if (!map.has(evt)) map.set(evt, new Set());
        map.get(evt).add(fn);
        return () => this.off(evt, fn);
      },
      off(evt, fn) {
        const set = map.get(evt);
        if (set) {
          set.delete(fn);
          if (!set.size) map.delete(evt);
        }
      },
      emit(evt, payload) {
        const set = map.get(evt);
        if (set) {
          set.forEach((fn) => {
            try {
              fn(payload);
            } catch (e) {
              console.error('[ExcelHelper][EventBus] handler error', evt, e);
            }
          });
        }
      },
    };
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  if (!window.ExcelHelperNS.eventBus)
    window.ExcelHelperNS.eventBus = createBus();
})();

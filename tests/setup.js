// JSDOM setup for basic DOM APIs
// Basic chrome runtime stub (onMessage + sendMessage)
const __onMessageListeners = [];
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      getURL: (p) => p,
      onMessage: { addListener: (fn) => __onMessageListeners.push(fn) },
      sendMessage: (msg, cb) => {
        let responded = false;
        __onMessageListeners.forEach((fn) => {
          const r = fn(msg, {}, (res) => {
            responded = true;
            cb && cb(res);
          });
          if (r === true) responded = true;
        });
        if (!responded && cb) cb();
      },
    },
    storage: { local: { get: (keys, cb) => cb({}), set: () => {} } },
  },
  writable: true,
});
Object.defineProperty(global, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() } },
  writable: true,
});

// Basic XLSX stub
global.XLSX = {
  utils: {
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_new: () => ({ sheets: [] }),
    book_append_sheet: (wb, ws, name) => {
      wb.sheets.push({ name, ws });
    },
  },
  writeFile: () => {},
};

document.head.innerHTML = '<meta charset="utf-8">';
// URL API stub for JSDOM
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => 'blob://test';
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}

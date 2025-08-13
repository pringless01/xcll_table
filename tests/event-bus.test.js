describe('event-bus basic on/off/emit branches', () => {
  beforeAll(() => {
    global.window = window;
    require('..\\src\\core\\event-bus.js');
  });

  test('on returns off function and off removes handler', () => {
    const bus = window.ExcelHelperNS.eventBus;
    const fn = jest.fn();
    const off = bus.on('x', fn);
    bus.emit('x', { a: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    bus.emit('x', { a: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('off on empty event and error inside handler are handled', () => {
    const bus = window.ExcelHelperNS.eventBus;
    const bad = () => { throw new Error('boom'); };
    const off = bus.on('y', bad);
    // Should not throw
    bus.emit('y', {});
    off();
    // off on non-existing should no-op
    bus.off('z', bad);
  });
});

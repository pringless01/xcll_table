const path = require('path');

describe('branch-helper scoreFlags', () => {
  let scoreFlags;
  beforeAll(() => {
    // Load the helper by injecting script text into JSDOM window
    const fs = require('fs');
    const p = path.resolve(__dirname, '..', 'src', 'core', 'branch-helper.js');
    const code = fs.readFileSync(p, 'utf8');
    // Execute in globals (window is JSDOM global)
    // eslint-disable-next-line no-eval
    eval(code);
    scoreFlags = global.window.ExcelHelperNS.scoreFlags;
  });

  test('all false yields negative score', () => {
    const f = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`f${i+1}`, false]));
    expect(scoreFlags(f)).toBe(-30);
  });

  test('all true yields positive score', () => {
    const f = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`f${i+1}`, true]));
    expect(scoreFlags(f)).toBe(30);
  });

  test('half true half false yields zero', () => {
    const f = {};
    for (let i = 1; i <= 30; i++) {
      f[`f${i}`] = i % 2 === 0;
    }
    expect(scoreFlags(f)).toBe(0);
  });

  test('random subset still deterministic', () => {
    const f = {};
    const on = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29];
    for (let i = 1; i <= 30; i++) {
      f[`f${i}`] = on.includes(i);
    }
    expect(scoreFlags(f)).toBe(0);
  });
});

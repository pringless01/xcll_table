const fs = require('fs');
const path = require('path');

describe('MV3 manifest validation', () => {
  test('manifest has required MV3 fields', () => {
    const file = path.join(__dirname, '..', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(
      manifest.background && manifest.background.service_worker
    ).toBeDefined();
    expect(manifest.action).toBeDefined();
    expect(Array.isArray(manifest.permissions)).toBe(true);
    expect(Array.isArray(manifest.host_permissions)).toBe(true);
    expect(Array.isArray(manifest.content_scripts)).toBe(true);

    // content_scripts matches must not use invalid wildcard like " *.com/* "
    const matches = manifest.content_scripts.flatMap((cs) => cs.matches || []);
    for (const m of matches) {
      if (m.includes('*.') && !m.startsWith('http') && m !== '<all_urls>') {
        throw new Error('Invalid host wildcard: ' + m);
      }
    }
  });
});

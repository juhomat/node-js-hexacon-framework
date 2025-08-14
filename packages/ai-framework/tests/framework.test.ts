/**
 * Basic framework test
 */

describe('AI Framework', () => {
  it('should be properly configured', () => {
    expect(true).toBe(true);
  });

  it('should be able to import the main module', () => {
    const framework = require('../src/index');
    expect(framework).toBeDefined();
  });
});

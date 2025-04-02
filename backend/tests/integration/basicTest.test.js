// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

const { setupDB } = require('../setup');

// Setup fresh database
setupDB();

describe('Basic Test', () => {
  test('1 + 1 should equal 2', () => {
    expect(1 + 1).toBe(2);
  });
}); 
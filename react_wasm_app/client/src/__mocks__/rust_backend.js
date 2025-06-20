module.exports = {
  __esModule: true, // This is important for ES modules that have a default export
  default: jest.fn().mockResolvedValue(undefined), // Mocks the init() function
  add: jest.fn((a, b) => a + b), // Mocks the add() function
};

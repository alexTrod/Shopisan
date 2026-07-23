/**
 * Jest Setup File
 * Global mocks and test configuration
 */

// Mock console.error to reduce noise in tests (optional)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render is no longer supported')
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });

// Global fetch mock
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn((event, handler) => {
        this._abortHandler = handler;
      }),
      removeEventListener: jest.fn(),
    };
  }

  abort() {
    this.signal.aborted = true;
    if (this._abortHandler) {
      this._abortHandler();
    }
  }
};

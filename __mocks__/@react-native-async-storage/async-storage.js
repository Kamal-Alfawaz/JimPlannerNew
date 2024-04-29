const mockAsyncStorage = new Map();

export default {
  setItem: jest.fn((key, value) => {
    return Promise.resolve(mockAsyncStorage.set(key, value));
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(mockAsyncStorage.get(key) || null);
  }),
  removeItem: jest.fn((key) => {
    return Promise.resolve(mockAsyncStorage.delete(key));
  }),
  clear: jest.fn(() => {
    mockAsyncStorage.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve([...mockAsyncStorage.keys()]);
  }),
};
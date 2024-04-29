export default () => ({
    ref: jest.fn(() => ({
        putFile: jest.fn(() => Promise.resolve({
            state: 'success',
            downloadURL: 'http://example.com/file.jpg'
        })),
        getDownloadURL: jest.fn(() => Promise.resolve('http://example.com/file.jpg')),
        delete: jest.fn(() => Promise.resolve())
    }))
});
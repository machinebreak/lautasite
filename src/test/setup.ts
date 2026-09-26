import '@testing-library/jest-dom/vitest'

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  value: MockIntersectionObserver,
})

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
})

// Las fotos del estudio se muestran con object URLs; jsdom no las implementa.
if (typeof URL.createObjectURL !== 'function') {
  let blobUrlCount = 0
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => `blob:lauta/${(blobUrlCount += 1)}`,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => {},
  })
}

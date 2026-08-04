// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom no implementa scrollTo; el modal de comidas lo usa al cerrar.
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = jest.fn()
} else if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn()
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))


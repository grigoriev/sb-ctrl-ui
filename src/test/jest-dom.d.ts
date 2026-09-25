// Vitest 5 no longer reads matchers from the global jest.Matchers interface.
// Add the jest-dom matchers to the Vitest matchers instead.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}

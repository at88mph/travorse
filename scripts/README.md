# scripts

This folder is only so `npm test` can run the VOSpace unit tests with Node's built-in test runner. It is not part of the application.

The app's TypeScript imports omit file extensions (`import { VosUri } from './vos-uri'`). Next.js resolves those, but Node does not. The `test` script loads `register-ts-extensions.mjs` before the tests, and that file registers `ts-extension-hook.mjs`. The hook appends `.ts` to relative imports that have no extension, so Node's type-stripping test runner can load the same source files the app uses.

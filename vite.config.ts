import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Emit relative asset URLs ("./assets/...") instead of root-absolute ("/assets/...").
  // GitHub Pages serves this project from the subpath https://must-canary.github.io/sut-value-forensics/,
  // where a root-absolute URL resolves to must-canary.github.io/assets/... and 404s.
  // A relative base resolves correctly under any prefix, so the same build works at
  // the Pages subpath, at `vite preview` on / (which the Playwright suite targets),
  // and at the dev server on / — without hardcoding the repository name.
  base: './',
  plugins: [react()],
  test: { globals: true, environment: 'node', include: ['test/**/*.test.ts'] },
})

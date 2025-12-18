export default {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  external: ['react', 'vue', 'svelte']
}

export default {
  entry: [
    'index.ts',
    'iconService.ts',
    'storage/factory.ts',
    'storage/local.ts',
    'storage/s3.ts',
    'providers/index.ts',
    'providers/google.ts',
    'providers/clearbit.ts',
    'providers/duckduckgo.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true
}

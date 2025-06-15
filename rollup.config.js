import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'spacegraph.js',
  external: ['three', 'gsap'],
  output: [
    {
      file: 'dist/spacegraph.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/spacegraph.umd.js',
      format: 'umd',
      name: 'SpaceGraphZUI',
      sourcemap: true,
      globals: {
        'three': 'THREE',
        'gsap': 'gsap'
      }
    }
  ],
  plugins: [
    resolve(),
    commonjs()
  ]
};

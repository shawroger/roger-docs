import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';


const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
  		external: ['layui'],
		globals: {
    		layui: 'layui'
  		},
  		paths: {
		   layui: './public/js/layui.js'
		},
		file: 'public/js/bundle.js'
	},
	plugins: [
		svelte({		
			dev: !production,
			css: css => {
				css.write('public/css/bundle.css');
			}
		}),
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
		commonjs(),
		!production && livereload('public'),			
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};

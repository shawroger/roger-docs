import Rexine from 'rexine'
import { writable } from 'svelte/store';


export function getSource(callback) {
	Rexine.get('./source/source.txt',(e)=>{
		callback.call(this,e);
	})
}

export const changePage = writable(true);
<script>	

	//svelte
    import { onMount } from 'svelte';

    import { navigate } from "svelte-routing";

    import { getSource } from '../Home/service.js'

    onMount(()=>{
    	getSource((e)=>{
    		for(let i=0; i < (e.json).length; i++) {
    			if(file === (e.json)[i].DATA0 && i !== 0) {
    				navigate("./" + file, { replace: true });
    				document.title = 'Docs --文档: '+file;
    				break;
    			}
    			if(i === (e.json).length-1) {
    				navigate("./home", { replace: true });
    				document.title = 'Docs --首页';
    			}
    		}
    	});

    });

    //set body data
    export let file;

</script>

<style>
  
    ._main_iframe {
        width: 100%;
        height: 90vh;
    }

    @media screen and (max-width: 750px) {  

        ._main_iframe {
            width: 100vw;
            height: 100vh;
        } 
    }

</style>



<div>
	<iframe 
		border="0"
		src="./source#/{file}" 
		class="_main_iframe" 
		title="docsify_docs"
	></iframe>
</div>
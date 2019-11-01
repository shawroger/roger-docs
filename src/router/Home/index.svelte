<script>  

    //svelte
    import { onMount } from 'svelte';

    import { changePage } from '../Home/service.js'

    //component
    import Nav from '../_App/Nav.svelte';
    import Footer from '../_App/Footer.svelte';
    import List from './List.svelte';
    import Iframe from './Iframe.svelte';

    //set body data
    export let file;

</script>

<Nav/>

{#if $changePage}
	<Iframe file={file} />
{:else}
	<List/>
{/if}

<Footer/>
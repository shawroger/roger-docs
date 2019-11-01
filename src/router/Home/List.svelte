<script>	

	//svelte
    import { onMount } from 'svelte';

    import { navigate } from "svelte-routing";

    import { Table, Pagination, PaginationItem, PaginationLink } from "sveltestrap";

    import { getSource, changePage } from '../Home/service.js'

    import Jumbotron from './Jumbotron.svelte'

    onMount(()=>{
    	getSource((e)=>{
    		source = e.json;
    		for(let i in source) {
    			source[i].id = i;
    		}
    		source = source.slice(1);
    		
    	});

    });

    function goView(id) {
    	let file_id = 0;
    	for(let i in source) {
    		if(source[i].id === id) {
    			file_id = i;
    		} 		
    	}
    	navigate("./" + source[file_id].DATA0, { replace: true });
    	changePage.update( v => !v );
    }

    $: getSearch = (function(source, search){
    	let result = [];
    	if(search === undefined) {
    		allpages = Math.ceil(source.length/size);
    		return source;
    	}
    	for(let i in source) {
    		if(source[i].DATA1.includes(search)) {
    			result.push(source[i]);
    		}
    	} 
    	allpages = Math.ceil(result.length/size);
    	page = 0;
    	console.log(result)
    	return result;
    })(source, search);


    $: size = (width < 750) ? 10 : 6;


    //set body data
    export let file;
    let source = [];
    let allpages;
    let page = 0;
    let search;
    let width;

</script>

<style>
  

</style>

<div style="width:100vw" bind:offsetWidth={width}></div>
<Jumbotron/>

<div class="input-group" style="padding: 10px">
	<input 
		type="text"
		placeholder="请输入检索内容" 
		class="form-control"
		bind:value={search}
	>
</div>


<Table>
	<tbody>
		<tr>
			<td style="text-align: center;">返回{getSearch.length}个结果</td>
		</tr>
		{#each getSearch as item, id}
		{#if (page*size <= id) && (id <= (page+1)*size-1)}
		<tr>
			<td on:click={()=>{goView(item.id)}}>{item.DATA1}</td>
		</tr>
		{/if}
		{/each}
	</tbody>
</Table>



<Pagination 
	ariaLabel="Page navigation example" 
	class="pagination justify-content-center"
>
	<PaginationItem>
		<PaginationLink first href="javacript:;" on:click={()=>{page=0}}/>
	</PaginationItem>

	{#if page !== 0}
	  	<PaginationItem disabled>
	    	<PaginationLink previous href="javacript:;" on:click={()=>{page--}}/>
	  	</PaginationItem>
	{/if}	

  	{#each [-1,0,1,2,3] as item}

  	{#if 0 < 1*(item+page) && 1*(item+page) <= allpages}		
  		<PaginationItem active={item===1}>
    		<PaginationLink 
    			href="javacript:;" 
    			on:click={()=>{page=1*(item+page)-1}}
    		>{1*(item+page)}
    		</PaginationLink>
  		</PaginationItem>		
  	{/if}
  	{/each}

  	{#if page !== allpages-1}
	  	<PaginationItem>
	    	<PaginationLink next href="javacript:;" on:click={()=>{page++}}/>
	  	</PaginationItem>
	{/if}	
	<PaginationItem>
		<PaginationLink last href="javacript:;" on:click={()=>{page=allpages-1}}/>
	</PaginationItem>
</Pagination>

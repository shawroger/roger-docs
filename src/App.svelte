<script>	
	import { Router, Link, Route } from "svelte-routing"
	import Home from './router/Home/index.svelte'

</script>

<svelte:head>

	
	<link rel="stylesheet" href="https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css">
	<link rel='stylesheet' href='./css/bootstrap.css'>
	<link rel='stylesheet' href='./css/bundle.css'>

</svelte:head>




<Router>
  	<Route path="/" component="{Home}" />
  	<Route path="/:file" let:params>
  		<Home file={params.file} />
  	</Route>
</Router>
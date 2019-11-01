<script>

	import { app } from '../../state/app.js';

	import { changePage } from '../Home/service.js'

	import {
		Collapse,
		Navbar,
		NavbarToggler,
		NavbarBrand,
		Nav,
		NavItem,
		NavLink,
		UncontrolledDropdown,
		DropdownToggle,
		DropdownMenu,
		DropdownItem
		
	} from 'sveltestrap';

	let isOpen = false;

	function handleUpdate(event) {
		isOpen = event.detail.isOpen;
	}


	function changePageValues() {
		changePage.update( v => !v );
	}

</script>

<Navbar color="light" light expand="md">
	<NavbarBrand href="./">
		<i class="fa fa-certificate"></i>
		{ app.title }
	</NavbarBrand>

	<NavbarToggler on:click={() => (isOpen = !isOpen)} />
	<Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
	<Nav class="ml-auto" navbar>
		<NavItem>
			<NavLink href="./">首页</NavLink>
		</NavItem>
		<NavItem>
			<NavLink href="javascript:;" on:click={changePageValues}>文档</NavLink>
		</NavItem>
	</Nav>
	</Collapse>
</Navbar>
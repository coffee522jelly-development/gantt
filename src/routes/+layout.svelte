<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { fetchJapaneseHolidays } from '$lib/api/holidays';

	let { children } = $props();

	onMount(() => {
		fetchJapaneseHolidays();
	});
</script>

{@render children()}

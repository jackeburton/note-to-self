<script setup>
import { ref, onMounted } from 'vue'

const apiEndpoint = 'http://localhost:3000/get-all-populated-entries';

const apiData = ref(null)

async function fetchData() {
	try {
		const response = await fetch(apiEndpoint);
		if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);		
	}
	const data = await response.json();
	apiData.value = data;
	} catch (error) {
		console.error("Fetch error: ", error);
	}
}

onMounted(() => {
	fetchData();
});

</script>

<template>
	<div class="styled-div" v-if="apiData">
		<h2>All entries and dates</h2>
		<ul>
			<li v-for="(item, index) in apiData" :key="index">
				{{ item.dateOfEntry }} - {{ item.journalEntry }}
			</li>
		</ul>
	</div>
</template>

<style scoped>
	.styled-div {
		border: 2px solid #000; /* solid black border */
		border-radius: 10px; /* rounded corners */
		padding: 20px; /* padding inside the div */
		margin: 20px; /* padding inside the div */
	}
</style>
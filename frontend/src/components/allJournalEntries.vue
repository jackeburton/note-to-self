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
  <div v-if="apiData">
	<h2>Api data</h2>
	<p>{{ apiData }}</p>
  </div>
</template>
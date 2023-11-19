<template>
	<div class="styled-div">
		<pre>{{dailyAnalysis}}</pre>
		<button v-if="buttonShown" @click="analyzeTodaysEntries">Analyze todays entry</button>
	</div>
</template>
<script>
	const apiEndpoint = 'http://localhost:3000/analyze-todays-entries';
	export default {
		data() {
			return {
				dailyAnalysis: '',
				buttonShown: true,
			}	
		},
		methods : {
			async analyzeTodaysEntries() {
				this.dailyAnalysis = 'loading'
			
				try {
					const response = await fetch(apiEndpoint)
					if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);		
                }
				const data = await response.json()

                this.buttonShown = false
				this.dailyAnalysis = data.responseString;
				} catch (error) {
					console.error("Fetch error: ", error);
				}		
			}
		}
	}
</script>
<style scoped>
	.styled-div {
		border: 2px solid #000; /* solid black border */
		border-radius: 10px; /* rounded corners */
		padding: 20px; /* padding inside the div */
		margin: 20px; /* padding inside the div */
	}

	pre {
		white-space: pre-wrap;
	}
</style>


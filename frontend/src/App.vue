<script setup>
import AllJournalEntries from './components/allJournalEntries.vue'
import { ref } from 'vue';

const counter = ref(0)

const text = ref("")

function increment() {
	counter.value++
}

const bool = ref(false)

</script>

<template>
	<input v-model="text">
	<p>{{ text }}</p>

	<p>{{ counter }}</p>

	<button @click="increment">add</button>

	<h1 v-if="bool">bool is true</h1>
	<h1 v-else>bool is false</h1>
	<AllJournalEntries />


</template>
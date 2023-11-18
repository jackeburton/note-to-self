<script>
import uploadJournalEntry from './uploadJournalEntry.vue';

export default {
        components: {
            'upload-journal-entry': uploadJournalEntry,
        },

        data() {
            return {
                components : [
                    'upload-journal-entry'
                ]
            };
        },

        methods: {
            addUpload() {
                console.log('adding component')
                this.components.push({ id: this.components.length })
            }
        }
    }   
</script>

<template>
    <div class="styled-div">
        <ul>
            <li v-for="(component, index) in components"  :key="index">
                <upload-journal-entry></upload-journal-entry>
            </li>
        </ul>
        <button @click="addUpload">Add component</button>
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
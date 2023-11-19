<script>

const apiEndpoint = 'http://localhost:3000/upload-journal-entry';

export default {
    data() {
        return {
            selectedFile: null,
            uploadDate: new Date().toISOString().substring(0, 10), // today's date in YYYY-MM-DD format
            apiData: ''
        };
    },
    methods : {
        handleFile(event){
            this.selectedFile = event.target.files[0]
        },
        async uploadFile() {
            if (!this.selectedFile){
                alert('Please select a file to upload');
                return;
            }

            this.apiData='loading'
            
            let formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('dateOfEntry', this.uploadDate);
            
            try {
                const response = await fetch(apiEndpoint, {
                    method: "POST", 
                    body: formData
                })
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);		
                }
                const data = await response.text();
                this.apiData = data;
            } catch (error) {
                console.error("Fetch error: ", error);
            }
        }
    }
};


</script>

<template>
    <div class="styled-div">
        <form @submit.prevent="uploadFile">
            <input type="file" @change="handleFile" />
            <input type="date" v-model="uploadDate" />
            <button type="submit">Upload</button>
        </form>
        {{apiData}}
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


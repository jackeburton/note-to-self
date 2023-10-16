import axios from "axios";
import { Router } from "express";

const router = Router();

router.get('/node-endpoint', (req, res) => {
    // Make a request to the Python service
    axios.get('http://localhost:5000/python-endpoint') // Replace with the Python service URL
        .then(response => {
            const data = response.data;
            res.send(`Received from Python: ${data}`);
        })
        .catch(error => {
            res.status(500).send('Error contacting the Python service.');
        });
});

export { router as pythonRouter }
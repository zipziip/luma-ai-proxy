const express = require('express');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Luma AI API configuration
const lumaApiKey = process.env.LUMA_API_KEY;
const lumaApiUrl = 'https://api.lumalabs.ai/dream-machine/v1/generations';

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Luma AI Proxy is running' });
});

// Upload image to Cloudinary
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });
        res.json({ imageUrl: result.secure_url });
    } catch (error) {
        res.status(500).json({ message: `Image upload failed: ${error.message}` });
    }
});

// Proxy Luma AI video generation
app.post('/', async (req, res) => {
    try {
        const response = await fetch(lumaApiUrl, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${lumaApiKey}`,
                'content-type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }
        res.json(await response.json());
    } catch (error) {
        res.status(500).json({ message: `API request failed: ${error.message}` });
    }
});

// Proxy Luma AI status check
app.get('/status/:id', async (req, res) => {
    try {
        const response = await fetch(`${lumaApiUrl}/${req.params.id}`, {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${lumaApiKey}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }
        res.json(await response.json());
    } catch (error) {
        res.status(500).json({ message: `Status check failed: ${error.message}` });
    }
});

module.exports = app;

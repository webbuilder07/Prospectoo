const express = require('express');
const router = express.Router();

// Placeholder routes for webhooks
router.post('/', (req, res) => {
    res.json({ message: 'Webhook received' });
});

module.exports = router;
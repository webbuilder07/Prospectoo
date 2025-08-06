const express = require('express');
const router = express.Router();

// Placeholder routes for dashboard
router.get('/stats', (req, res) => {
    res.json({ message: 'Dashboard stats placeholder' });
});

module.exports = router;
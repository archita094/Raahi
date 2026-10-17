const express = require('express');
const router = express.Router();
const { importPdfData } = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.post('/admin/import-pdf', requireAdminAuth, importPdfData);

module.exports = router;


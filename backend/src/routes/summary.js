const router = require('express').Router();
const { getSummary } = require('../controllers/summary');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', getSummary);

module.exports = router;

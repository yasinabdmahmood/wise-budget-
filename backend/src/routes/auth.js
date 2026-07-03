const router = require('express').Router();
const { register, login, me, updateMe } = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.get ('/me',       requireAuth, me);
router.put ('/me',       requireAuth, updateMe);

module.exports = router;

const router = require('express').Router();
const { list, getOne, create, update, remove } = require('../controllers/transactions');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get   ('/',    list);
router.get   ('/:id', getOne);
router.post  ('/',    create);
router.put   ('/:id', update);
router.delete('/:id', remove);

module.exports = router;

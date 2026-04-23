const express = require('express');
const router  = express.Router();

const {
  createCollection,
  getMyCollections,
  getCollectionById,
  updateCollection,
  updateCollectionNotes,
  deleteCollection,
} = require('../controllers/collectionController');

const { protect } = require('../middleware/auth');

// All collection routes are private
router.use(protect);

router.get('/',    getMyCollections);
router.get('/:id', getCollectionById);
router.post('/',   createCollection);
router.put('/:id',        updateCollection);
router.put('/:id/notes',  updateCollectionNotes); // add/remove a note
router.delete('/:id',     deleteCollection);

module.exports = router;

const express = require('express');
const router  = express.Router();

const {
  createCollection,
  getMyCollections,
  getPublicCollections,
  getCollectionById,
  updateCollection,
  updateCollectionNotes,
  updateCollectionFulfillments,
  deleteCollection,
  voteCollection,
} = require('./collectionController');

const { protect } = require('../../middleware/auth');

// All collection routes are private
router.use(protect);

router.get('/public', getPublicCollections);
router.get('/',    getMyCollections);
router.get('/:id', getCollectionById);
router.post('/',   createCollection);
router.put('/:id',        updateCollection);
router.put('/:id/vote',   voteCollection);
router.put('/:id/notes',  updateCollectionNotes); // add/remove a note
router.put('/:id/fulfillments', updateCollectionFulfillments); // add/remove a fulfilled request attachment
router.delete('/:id',     deleteCollection);

module.exports = router;

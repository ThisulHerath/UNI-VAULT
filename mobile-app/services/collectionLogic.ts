import { collectionService } from './dataServices';

const DEFAULT_COLLECTION_NAME = 'Saved Notes';

const getNoteId = (note: any): string | null => {
  if (!note) return null;
  if (typeof note === 'string') return note;
  if (typeof note === 'object') {
    if (note._id) return String(note._id);
    if (note.id) return String(note.id);
  }
  return null;
};

const getCollections = async (): Promise<any[]> => {
  const response = await collectionService.getMyCollections();
  return Array.isArray(response?.data) ? response.data : [];
};

const isNoteInCollection = (collection: any, noteId: string): boolean => {
  const notes = Array.isArray(collection?.notes) ? collection.notes : [];
  return notes.some((note: any) => getNoteId(note) === noteId);
};

const isFulfillmentInCollection = (collection: any, requestId: string): boolean => {
  const fulfillments = Array.isArray(collection?.requestFulfillments) ? collection.requestFulfillments : [];
  return fulfillments.some((request: any) => getNoteId(request) === requestId);
};

const selectDefaultCollection = (collections: any[]): any | null => {
  if (!collections.length) return null;

  const savedNotesCollection = collections.find((collection) =>
    String(collection?.name || '').trim().toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()
  );

  return savedNotesCollection || collections[0];
};

const ensureTargetCollection = async (): Promise<{ collection: any; created: boolean }> => {
  const currentCollections = await getCollections();
  const existing = selectDefaultCollection(currentCollections);
  if (existing) {
    return { collection: existing, created: false };
  }

  const created = await collectionService.createCollection({
    name: DEFAULT_COLLECTION_NAME,
    description: 'Quick saves from notes, groups, and requests.',
    isPrivate: true,
  });

  return { collection: created?.data, created: true };
};

export const getNoteSaveState = async (noteId: string): Promise<{ isSaved: boolean; collectionCount: number }> => {
  if (!noteId) return { isSaved: false, collectionCount: 0 };

  const collections = await getCollections();
  const containingCollections = collections.filter((collection) => isNoteInCollection(collection, noteId));

  return {
    isSaved: containingCollections.length > 0,
    collectionCount: containingCollections.length,
  };
};

export const getSavedStateMapForNotes = async (noteIds: string[]): Promise<Record<string, boolean>> => {
  const normalized = noteIds.filter(Boolean);
  if (!normalized.length) return {};

  const collections = await getCollections();
  const savedSet = new Set<string>();

  collections.forEach((collection) => {
    (collection?.notes || []).forEach((note: any) => {
      const id = getNoteId(note);
      if (id) savedSet.add(id);
    });
  });

  return normalized.reduce<Record<string, boolean>>((acc, id) => {
    acc[id] = savedSet.has(id);
    return acc;
  }, {});
};

export const saveNoteToCollections = async (noteId: string): Promise<{ createdCollection: boolean; collectionName: string }> => {
  if (!noteId) {
    throw new Error('A valid note is required to save.');
  }

  const { collection, created } = await ensureTargetCollection();
  if (!collection?._id) {
    throw new Error('Unable to access a collection right now. Please try again.');
  }

  if (isNoteInCollection(collection, noteId)) {
    return {
      createdCollection: false,
      collectionName: collection.name || DEFAULT_COLLECTION_NAME,
    };
  }

  await collectionService.updateNotes(collection._id, noteId, 'add');

  return {
    createdCollection: created,
    collectionName: collection.name || DEFAULT_COLLECTION_NAME,
  };
};

export const removeNoteFromAllCollections = async (noteId: string): Promise<number> => {
  if (!noteId) {
    throw new Error('A valid note is required to remove.');
  }

  const collections = await getCollections();
  const containingCollections = collections.filter((collection) => isNoteInCollection(collection, noteId));

  if (!containingCollections.length) {
    return 0;
  }

  await Promise.all(
    containingCollections.map((collection) =>
      collectionService.updateNotes(collection._id, noteId, 'remove')
    )
  );

  return containingCollections.length;
};

export const getFulfillmentSaveState = async (requestId: string): Promise<{ isSaved: boolean; collectionCount: number }> => {
  if (!requestId) return { isSaved: false, collectionCount: 0 };

  const collections = await getCollections();
  const containingCollections = collections.filter((collection) => isFulfillmentInCollection(collection, requestId));

  return {
    isSaved: containingCollections.length > 0,
    collectionCount: containingCollections.length,
  };
};

export const saveFulfillmentToCollections = async (requestId: string): Promise<{ createdCollection: boolean; collectionName: string }> => {
  if (!requestId) {
    throw new Error('A valid request fulfillment is required to save.');
  }

  const { collection, created } = await ensureTargetCollection();
  if (!collection?._id) {
    throw new Error('Unable to access a collection right now. Please try again.');
  }

  if (isFulfillmentInCollection(collection, requestId)) {
    return {
      createdCollection: false,
      collectionName: collection.name || DEFAULT_COLLECTION_NAME,
    };
  }

  await collectionService.updateFulfillments(collection._id, requestId, 'add');

  return {
    createdCollection: created,
    collectionName: collection.name || DEFAULT_COLLECTION_NAME,
  };
};

export const removeFulfillmentFromAllCollections = async (requestId: string): Promise<number> => {
  if (!requestId) {
    throw new Error('A valid request fulfillment is required to remove.');
  }

  const collections = await getCollections();
  const containingCollections = collections.filter((collection) => isFulfillmentInCollection(collection, requestId));

  if (!containingCollections.length) {
    return 0;
  }

  await Promise.all(
    containingCollections.map((collection) =>
      collectionService.updateFulfillments(collection._id, requestId, 'remove')
    )
  );

  return containingCollections.length;
};
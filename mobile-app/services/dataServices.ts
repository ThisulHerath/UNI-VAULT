import api from './api';

export const noteService = {
  getNotes: async (params?: object) => {
    const res = await api.get('/notes', { params });
    return res.data;
  },
  getMyNotes: async (params?: object) => {
    const res = await api.get('/notes/my', { params });
    return res.data;
  },
  getNoteById: async (id: string) => {
    const res = await api.get(`/notes/${id}`);
    return res.data;
  },
  createNote: async (formData: FormData) => {
    const res = await api.post('/notes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  updateNote: async (id: string, data: object) => {
    const res = await api.put(`/notes/${id}`, data);
    return res.data;
  },
  deleteNote: async (id: string) => {
    const res = await api.delete(`/notes/${id}`);
    return res.data;
  },

  // Reviews nested under notes
  getReviews: async (noteId: string, params?: object) => {
    const res = await api.get(`/notes/${noteId}/reviews`, { params });
    return res.data;
  },
  createReview: async (noteId: string, data: { rating: number; comment?: string }) => {
    const res = await api.post(`/notes/${noteId}/reviews`, data);
    return res.data;
  },
};

export const subjectService = {
  getSubjects: async (params?: object) => {
    const res = await api.get('/subjects', { params });
    return res.data;
  },
  getSubjectById: async (id: string) => {
    const res = await api.get(`/subjects/${id}`);
    return res.data;
  },
  createSubject: async (data: object) => {
    const res = await api.post('/subjects', data);
    return res.data;
  },
  updateSubject: async (id: string, data: object) => {
    const res = await api.put(`/subjects/${id}`, data);
    return res.data;
  },
  deleteSubject: async (id: string) => {
    const res = await api.delete(`/subjects/${id}`);
    return res.data;
  },
};

export const reviewService = {
  createReview: async (noteId: string, data: { rating: number; comment?: string }) => {
    const res = await api.post(`/notes/${noteId}/reviews`, data);
    return res.data;
  },
  getReviewById: async (id: string) => {
    const res = await api.get(`/reviews/${id}`);
    return res.data;
  },
  updateReview: async (id: string, data: object) => {
    const res = await api.put(`/reviews/${id}`, data);
    return res.data;
  },
  deleteReview: async (id: string) => {
    const res = await api.delete(`/reviews/${id}`);
    return res.data;
  },
  voteReview: async (id: string, value: 'helpful' | 'notHelpful') => {
    const res = await api.post(`/reviews/${id}/vote`, { value });
    return res.data;
  },
  reportReview: async (id: string, reason: 'spam' | 'offensive' | 'misleading') => {
    const res = await api.post(`/reviews/${id}/report`, { reason });
    return res.data;
  },
};

export const requestService = {
  getRequests: async (params?: object) => {
    const res = await api.get('/requests', { params });
    return res.data;
  },
  getRequestById: async (id: string) => {
    const res = await api.get(`/requests/${id}`);
    return res.data;
  },
  createRequest: async (data: object) => {
    const res = await api.post('/requests', data);
    return res.data;
  },
  updateRequest: async (id: string, data: object) => {
    const res = await api.put(`/requests/${id}`, data);
    return res.data;
  },
  deleteRequest: async (id: string) => {
    const res = await api.delete(`/requests/${id}`);
    return res.data;
  },
};

export const collectionService = {
  getMyCollections: async () => {
    const res = await api.get('/collections');
    return res.data;
  },
  getCollectionById: async (id: string) => {
    const res = await api.get(`/collections/${id}`);
    return res.data;
  },
  createCollection: async (data: object) => {
    const res = await api.post('/collections', data);
    return res.data;
  },
  updateCollection: async (id: string, data: object) => {
    const res = await api.put(`/collections/${id}`, data);
    return res.data;
  },
  updateNotes: async (id: string, noteId: string, action: 'add' | 'remove') => {
    const res = await api.put(`/collections/${id}/notes`, { noteId, action });
    return res.data;
  },
  deleteCollection: async (id: string) => {
    const res = await api.delete(`/collections/${id}`);
    return res.data;
  },
};

export const groupService = {
  getGroups: async (params?: object) => {
    const res = await api.get('/groups', { params });
    return res.data;
  },
  getGroupById: async (id: string) => {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  },
  createGroup: async (formData: FormData) => {
    const res = await api.post('/groups', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  updateGroup: async (id: string, formData: FormData) => {
    const res = await api.put(`/groups/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteGroup: async (id: string) => {
    const res = await api.delete(`/groups/${id}`);
    return res.data;
  },
  joinGroup: async (id: string) => {
    const res = await api.post(`/groups/${id}/join`);
    return res.data;
  },
  manageMember: async (id: string, userId: string, action: 'approve' | 'remove') => {
    const res = await api.put(`/groups/${id}/members/${userId}`, { action });
    return res.data;
  },
  manageNote: async (id: string, noteId: string, action: 'add' | 'remove') => {
    const res = await api.put(`/groups/${id}/notes`, { noteId, action });
    return res.data;
  },
};

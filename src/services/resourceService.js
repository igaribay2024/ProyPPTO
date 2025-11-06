import api from './api';

// All CRUD endpoints are mounted under /api on the server
const base = '/api';

const list = (resource) => api.get(`${base}/${resource}`).then(r => r.data);
const get = (resource, id) => api.get(`${base}/${resource}/${id}`).then(r => r.data);
const create = (resource, data) => api.post(`${base}/${resource}`, data).then(r => r.data);
const update = (resource, id, data) => {
  // Guard: don't allow update calls with empty/falsy id — fail fast in client
  if (id === undefined || id === null || String(id).trim() === '') {
    return Promise.reject(new Error(`Invalid id for update on resource "${resource}": ${id}`));
  }
  return api.put(`${base}/${resource}/${id}`, data).then(r => r.data);
};
const remove = (resource, id) => api.delete(`${base}/${resource}/${id}`).then(r => r.data);

const resourceService = {
  list,
  get,
  create,
  update,
  remove,
};

export default resourceService;

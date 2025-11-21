import api from './api';
import { normalizePayloadForFields } from '../utils/formatters';

// All CRUD endpoints are mounted under /api on the server
const base = '/api';

// append timestamp to bypass caches that return 304. Backend should return actual data.
const list = (resource) => api.get(`${base}/${resource}`, { params: { _ts: Date.now() } }).then(r => r.data);
const get = (resource, id) => api.get(`${base}/${resource}/${id}`).then(r => r.data);

/**
 * resourceService
 *
 * Tiny CRUD wrapper used across the app to talk with the backend generic CRUD endpoints.
 * It intentionally centralizes small client-side helpers such as a targeted normalization
 * of numeric-like string fields to avoid sending malformed numeric values to the DB.
 *
 * Behavior summary:
 * - list(resource): GET /api/<resource>?_ts=<timestamp> (cache-busting)
 * - get(resource,id): GET /api/<resource>/<id>
 * - create(resource,data): POST /api/<resource> (applies resource-specific numeric normalization)
 * - update(resource,id,data): PUT /api/<resource>/<id> (applies resource-specific numeric normalization)
 * - remove(resource,id): DELETE /api/<resource>/<id>
 *
 * Resource-specific numeric fields map: add resource keys here to control which fields
 * should be normalized (e.g., remove thousand separators, convert comma decimals to dot).
 * This avoids touching unrelated text fields.
 */

// Map of resource -> numeric-like fields to normalize. Keeps normalization targeted and safe.
const numericFieldsByResource = {
  gastos: ['monto', 'tipo_cambio'],
  partidas: ['monto', 'importe'],
  presupuestos: ['importe', 'monto'],
  cuentas: ['saldo'],
  conceptos: [],
  plantas: [],
  usuarios: [],
};

function fieldsForResource(resource) {
  return numericFieldsByResource[resource] || [];
}

/**
 * Create a resource on the server.
 * The payload will be cleaned for numeric-like fields defined in the map above.
 * @param {string} resource - logical resource name (e.g., 'gastos')
 * @param {object} data - payload to send
 * @returns {Promise<any>} created resource from server
 */
const create = (resource, data) => {
  const cleaned = normalizePayloadForFields(data, fieldsForResource(resource));
  return api.post(`${base}/${resource}`, cleaned).then(r => r.data);
};

const update = (resource, id, data) => {
  // Guard: don't allow update calls with empty/falsy id — fail fast in client
  if (id === undefined || id === null || String(id).trim() === '') {
    return Promise.reject(new Error(`Invalid id for update on resource "${resource}": ${id}`));
  }
  const cleaned = normalizePayloadForFields(data, fieldsForResource(resource));
  return api.put(`${base}/${resource}/${id}`, cleaned).then(r => r.data);
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

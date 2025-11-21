import api from './api';

const API = '/api/presupuestos';

export const getPresupuestos = async () => await api.get(API);
export const createPresupuesto = async (data) => await api.post(API, data);
export const updatePresupuesto = async (id, data) => await api.put(`${API}/${id}`, data);
export const deletePresupuesto = async (id) => await api.delete(`${API}/${id}`);
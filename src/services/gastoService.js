import api from './api';

const API = '/api/gastos';

export const getGastos = async () => await api.get(API);
export const createGasto = async (data) => await api.post(API, data);
export const updateGasto = async (id, data) => await api.put(`${API}/${id}`, data);
export const deleteGasto = async (id) => await api.delete(`${API}/${id}`);
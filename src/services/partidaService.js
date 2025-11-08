import api from './api';

const API = '/api/partidas';

export const getPartidas = async () => await api.get(API);
export const createPartida = async (data) => await api.post(API, data);
export const updatePartida = async (id, data) => await api.put(`${API}/${id}`, data);
export const deletePartida = async (id) => await api.delete(`${API}/${id}`);

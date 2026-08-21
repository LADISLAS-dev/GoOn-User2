import axios from 'axios';
import { API_URL } from '../env';

const API = API_URL;

export const createUserProfile = (data) =>
  axios.post(`${API}/users`, data).then(res => res.data);

export const getUserByFirebaseUid = (uid) =>
  axios.get(`${API}/users/firebase/${uid}`).then(res => res.data);

export const updatePushToken = (id, token) =>
  axios.patch(`${API}/users/${id}/push-token`, {
    expoPushToken: token,
  }).then(res => res.data);
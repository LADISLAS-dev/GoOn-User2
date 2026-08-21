import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export const registerUser = async (email, password) => {
  const response =
    await createUserWithEmailAndPassword(auth, email, password);

  return response.user;
};

export const loginUser = async (email, password) => {
  const response =
    await signInWithEmailAndPassword(auth, email, password);

  return response.user;
};

export const logoutUser = async () => {
  return signOut(auth);
};

export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};
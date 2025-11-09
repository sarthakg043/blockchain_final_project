import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AccessPolicy {
  matrix: number[][];
  rho: { [key: number]: string };
}

export const createRide = async (plaintext: string, policy: AccessPolicy, riderAddress: string) => {
  const response = await api.post('/api/rides', {
    plaintext,
    policy,
    riderAddress,
  });
  return response.data;
};

export const proposeRide = async (rideId: string, driverAddress: string, driverPrivateKey: string, trip: any) => {
  const response = await api.post(`/api/rides/${rideId}/proposals`, {
    driverAddress,
    driverPrivateKey,
    trip,
  });
  return response.data;
};

export const matchDriver = async (rideId: string, driverAddress: string, driverAttributes: string[]) => {
  const response = await api.post(`/api/rides/${rideId}/match`, {
    driverAddress,
    driverAttributes,
  });
  return response.data;
};

export const getRide = async (rideId: string) => {
  const response = await api.get(`/api/rides/${rideId}`);
  return response.data;
};

export const completeRide = async (rideId: string) => {
  const response = await api.post(`/api/rides/${rideId}/complete`);
  return response.data;
};

export const decryptRide = async (rideId: string, userPtid: string) => {
  const response = await api.get(`/api/rides/${rideId}/decrypt?userPtid=${userPtid}`);
  return response.data;
};

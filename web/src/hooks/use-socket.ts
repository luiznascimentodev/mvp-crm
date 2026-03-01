import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface DealUpdatedPayload {
  id: string;
  stage: string;
  probability: number;
  isActive: boolean;
  updatedAt: string;
}

export interface DealCreatedPayload {
  id: string;
  tenantId: string;
  ownerId: string;
  title: string;
  value: string;
  stage: string;
  probability: number;
  isActive: boolean;
  createdAt: string;
}

export interface DealDeletedPayload {
  id: string;
}

interface UseSocketReturn {
  isConnected: boolean;
  onDealUpdated: (cb: (payload: DealUpdatedPayload) => void) => () => void;
  onDealCreated: (cb: (payload: DealCreatedPayload) => void) => () => void;
  onDealDeleted: (cb: (payload: DealDeletedPayload) => void) => () => void;
}

export function useSocket(): UseSocketReturn {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const onDealUpdated = (cb: (payload: DealUpdatedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('deal.updated', cb);
    return () => socket.off('deal.updated', cb);
  };

  const onDealCreated = (cb: (payload: DealCreatedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('deal.created', cb);
    return () => socket.off('deal.created', cb);
  };

  const onDealDeleted = (cb: (payload: DealDeletedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('deal.deleted', cb);
    return () => socket.off('deal.deleted', cb);
  };

  return { isConnected, onDealUpdated, onDealCreated, onDealDeleted };
}

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface LeadUpdatedPayload {
  leadId: string;
  status: string;
  updatedBy: string;
}

export interface LeadCreatedPayload {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface LeadDeletedPayload {
  leadId: string;
}

interface UseSocketReturn {
  isConnected: boolean;
  onLeadUpdated: (cb: (payload: LeadUpdatedPayload) => void) => () => void;
  onLeadCreated: (cb: (payload: LeadCreatedPayload) => void) => () => void;
  onLeadDeleted: (cb: (payload: LeadDeletedPayload) => void) => () => void;
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

  const onLeadUpdated = (cb: (payload: LeadUpdatedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('lead.updated', cb);
    return () => socket.off('lead.updated', cb);
  };

  const onLeadCreated = (cb: (payload: LeadCreatedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('lead.created', cb);
    return () => socket.off('lead.created', cb);
  };

  const onLeadDeleted = (cb: (payload: LeadDeletedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('lead.deleted', cb);
    return () => socket.off('lead.deleted', cb);
  };

  return { isConnected, onLeadUpdated, onLeadCreated, onLeadDeleted };
}

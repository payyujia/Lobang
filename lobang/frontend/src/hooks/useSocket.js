import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let _socket = null; // singleton

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!_socket) {
      _socket = io(import.meta.env.VITE_API_URL || '', {
        withCredentials: true,
        transports: ['websocket'],
      });
    }
    socketRef.current = _socket;

    return () => {
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { emit, on, socket: socketRef.current };
}

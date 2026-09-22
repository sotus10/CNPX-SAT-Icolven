import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { addAlert } from '../store/slices/alertsSlice';
import { updateMetric } from '../store/slices/dashboardSlice';
import { WS_URL } from '../config';

const useWebSocket = (url = WS_URL) => {
  const dispatch = useDispatch();
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('[WS] conectado a', url);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'metric_update') {
            dispatch(updateMetric(message.payload));
          } else if (message.type === 'alert') {
            dispatch(addAlert(message.payload));
          }
        } catch (error) {
          console.error('[WS] mensaje inválido', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] error', error);
      };

      wsRef.current.onclose = (event) => {
        console.log('[WS] conexión cerrada', event.reason);
        // Nota: reconexión real pendiente de implementar en el backend stack.
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, dispatch]);

  return wsRef.current;
};

export default useWebSocket;
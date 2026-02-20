import { useState, useEffect, useCallback } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

interface NetworkState {
  online: boolean;
  quality: NetworkQuality;
  rtt: number;
  downlink: number;
}

export function useNetwork() {
  const [state, setState] = useState<NetworkState>({
    online: true,
    quality: 'good',
    rtt: 0,
    downlink: 0,
  });

  const updateNetworkInfo = useCallback(() => {
    const conn = (navigator as any).connection;
    const online = navigator.onLine;

    if (!online) {
      setState({ online: false, quality: 'offline', rtt: 0, downlink: 0 });
      return;
    }

    if (conn) {
      const rtt = conn.rtt || 0;
      const downlink = conn.downlink || 0;
      let quality: NetworkQuality = 'excellent';

      if (rtt > 500 || downlink < 0.5) quality = 'poor';
      else if (rtt > 200 || downlink < 2) quality = 'good';

      setState({ online: true, quality, rtt, downlink });
    } else {
      setState({ online: true, quality: 'good', rtt: 0, downlink: 0 });
    }
  }, []);

  useEffect(() => {
    updateNetworkInfo();

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateNetworkInfo);
    }

    const interval = setInterval(updateNetworkInfo, 5000);

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (conn) conn.removeEventListener('change', updateNetworkInfo);
      clearInterval(interval);
    };
  }, [updateNetworkInfo]);

  return state;
}

export default useNetwork;
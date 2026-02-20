import { useState, useRef, useCallback, useEffect } from 'react';
import * as api from '@/lib/api';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';

export interface ActiveCallInfo {
  callId: string;
  chatId: string;
  callType: 'voice' | 'video';
  peerName: string;
  peerAvatar: string;
  isIncoming: boolean;
}

export function useWebRTC(userId: string | null) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<ActiveCallInfo | null>(null);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const durationRef = useRef<ReturnType<typeof setInterval>>();
  const knownCandidatesRef = useRef<Set<string>>(new Set());
  const callIdRef = useRef<string>('');
  const endCallRef = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (durationRef.current) clearInterval(durationRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    knownCandidatesRef.current.clear();
    callIdRef.current = '';
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate && callIdRef.current) {
        api.sendIceCandidate(callIdRef.current, JSON.stringify(e.candidate));
      }
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('active');
        setDuration(0);
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCallRef.current();
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const getMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: 'user', width: 640, height: 480 } : false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      return stream;
    }
  }, []);

  const startPolling = useCallback((callId: string) => {
    callIdRef.current = callId;
    pollRef.current = setInterval(async () => {
      if (!callIdRef.current) return;
      try {
        const res = await api.pollCall();
        if (!res.call) {
          setCallState('ended');
          setTimeout(() => { cleanup(); setCallState('idle'); setCallInfo(null); }, 800);
          return;
        }

        if (res.call.status === 'active' && res.call.sdp_answer && pcRef.current && !pcRef.current.remoteDescription) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(res.call.sdp_answer)));
          setCallState('connecting');
        }

        if (res.ice_candidates) {
          for (const c of res.ice_candidates) {
            if (!knownCandidatesRef.current.has(c.id) && pcRef.current) {
              knownCandidatesRef.current.add(c.id);
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(c.candidate)));
              } catch { /* noop */ }
            }
          }
        }
      } catch { /* noop */ }
    }, 1000);
  }, [cleanup]);

  const startCall = useCallback(async (
    calleeId: string,
    chatId: string,
    callType: 'voice' | 'video',
    peerName: string,
    peerAvatar: string,
  ) => {
    if (callState !== 'idle') return;

    setCallState('calling');
    setCallInfo({ callId: '', chatId, callType, peerName, peerAvatar, isIncoming: false });
    setDuration(0);

    try {
      const stream = await getMedia(callType === 'video');
      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await api.initiateCall(calleeId, chatId, callType, JSON.stringify(offer));
      if (res.error || !res.call_id) {
        cleanup();
        setCallState('idle');
        setCallInfo(null);
        return;
      }

      callIdRef.current = res.call_id;
      setCallInfo(prev => prev ? { ...prev, callId: res.call_id } : null);
      startPolling(res.call_id);
    } catch (e) {
      console.error('[WebRTC] startCall error:', e);
      cleanup();
      setCallState('idle');
      setCallInfo(null);
    }
  }, [callState, getMedia, createPeerConnection, startPolling, cleanup]);

  const acceptCall = useCallback(async (call: {
    id: string;
    chat_id: string;
    call_type: 'voice' | 'video';
    sdp_offer: string;
    peer_name: string;
    peer_avatar: string;
    ice_candidates?: { id: string; candidate: string }[];
  }) => {
    setCallState('connecting');
    setCallInfo({
      callId: call.id,
      chatId: call.chat_id,
      callType: call.call_type as 'voice' | 'video',
      peerName: call.peer_name,
      peerAvatar: call.peer_avatar,
      isIncoming: true,
    });

    try {
      const stream = await getMedia(call.call_type === 'video');
      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(call.sdp_offer)));

      if (call.ice_candidates) {
        for (const c of call.ice_candidates) {
          try {
            knownCandidatesRef.current.add(c.id);
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c.candidate)));
          } catch { /* noop */ }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      callIdRef.current = call.id;
      await api.answerCall(call.id, JSON.stringify(answer));

      startPolling(call.id);
    } catch (e) {
      console.error('[WebRTC] acceptCall error:', e);
      cleanup();
      setCallState('idle');
      setCallInfo(null);
    }
  }, [getMedia, createPeerConnection, startPolling, cleanup]);

  const endCurrentCall = useCallback(() => {
    if (callIdRef.current) {
      api.endCall(callIdRef.current);
    }
    setCallState('ended');
    setTimeout(() => {
      cleanup();
      setCallState('idle');
      setCallInfo(null);
    }, 800);
  }, [cleanup]);

  endCallRef.current = endCurrentCall;

  const rejectCurrentCall = useCallback((callId: string) => {
    api.rejectCall(callId);
    cleanup();
    setCallState('idle');
    setCallInfo(null);
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn(prev => !prev);
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    callInfo,
    duration,
    muted,
    speakerOn,
    startCall,
    acceptCall,
    endCurrentCall,
    rejectCurrentCall,
    toggleMute,
    toggleSpeaker,
  };
}

export default useWebRTC;
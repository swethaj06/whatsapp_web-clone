import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  MdCall,
  MdVideoCall,
  MdSearch,
  MdSend,
  MdClose,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
  MdMoreVert,
  MdDeleteOutline,
  MdArrowBack,
  MdStar,
  MdStarBorder,
  MdOpenInNew,
  MdDownload,
  MdCallEnd,
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
  MdPause,
  MdPlayArrow,
  MdStop,
  MdLock
} from 'react-icons/md';
import { BsEmojiSmile, BsPaperclip, BsMic, BsFillPlusCircleFill } from 'react-icons/bs';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { AiOutlineClear } from 'react-icons/ai';
import { FaFileLines, FaImage, FaHeadphones } from 'react-icons/fa6';
import { BiCheckDouble, BiCheck } from 'react-icons/bi';
import { messageAPI, groupAPI, normalizeFileUrl } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import './ChatWindow.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const MAX_VOICE_DURATION_SECONDS = 300;
const MIN_VOICE_DURATION_MS = 700;
const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm'
];

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const supportedType = AUDIO_MIME_CANDIDATES.find((mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch (error) {
      return false;
    }
  });

  return supportedType || '';
};

const formatDateSeparator = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  const isToday = messageDate.toDateString() === today.toDateString();
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();

  if (isToday) {
    return 'Today';
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }
};

const ChatWindow = ({ selectedUser, selectedGroup, messages, onSendMessage, currentUser, isTyping, socket, onClearChat, onDeleteChat, setMessages, onLeaveGroup }) => {
  const [messageText, setMessageText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showLeaveGroupConfirmation, setShowLeaveGroupConfirmation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ type: 'success', title: '', message: '' });
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingPreview, setRecordingPreview] = useState(null);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_VOICE_DURATION_SECONDS);
  const [voicePlayback, setVoicePlayback] = useState({});
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activeVoiceMessageId, setActiveVoiceMessageId] = useState(null);
  const [callState, setCallState] = useState({
    isOpen: false,
    isIncoming: false,
    isConnected: false,
    isMuted: false,
    isVideoEnabled: true,
    callType: 'audio',
    status: '',
    callerName: '',
    callerAvatar: '',
    callId: null,
    callDuration: 0
  });
  const [callNotificationSent, setCallNotificationSent] = useState(false);
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('whatsapp_favourites')) || [];
    } catch (e) {
      return [];
    }
  });

  const typingTimeoutRef = useRef(null);
  const photoVideoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const dropdownRef = useRef(null);
  const attachmentRef = useRef(null);
  const emojiRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const currentCallUserIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const callTimerRef = useRef(null);
  const callStatusRef = useRef({ isOpen: false, isConnected: false, isIncoming: false });
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingMimeTypeRef = useRef('');
  const voiceAudioRefs = useRef({});
  const messageRefs = useRef({});

  const toggleFavourite = (userId, e) => {
    e.stopPropagation();
    let newFavs;
    if (favourites.includes(userId)) {
      newFavs = favourites.filter(id => id !== userId);
    } else {
      newFavs = [...favourites, userId];
    }
    setFavourites(newFavs);
    localStorage.setItem('whatsapp_favourites', JSON.stringify(newFavs));
    window.dispatchEvent(new CustomEvent('favourites_updated', { detail: newFavs }));
  };

  useEffect(() => {
    const handleFavouritesUpdate = (e) => {
      setFavourites(e.detail);
    };
    window.addEventListener('favourites_updated', handleFavouritesUpdate);
    return () => {
      window.removeEventListener('favourites_updated', handleFavouritesUpdate);
    };
  }, []);

  const showCallNotification = (type, title, message) => {
    setNotificationData({ type, title, message });
    setShowNotification(true);
  };

  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const stopLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const clearRemoteMedia = () => {
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const startCallDurationTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    callTimerRef.current = setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        callDuration: callStartTimeRef.current
          ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          : 0
      }));
    }, 1000);
  };

  const resetCallState = () => {
    cleanupPeerConnection();
    stopLocalMedia();
    clearRemoteMedia();
    pendingOfferRef.current = null;
    currentCallUserIdRef.current = null;
    callStartTimeRef.current = null;

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    callStatusRef.current = {
      isOpen: false,
      isConnected: false,
      isIncoming: false
    };

    setCallState({
      isOpen: false,
      isIncoming: false,
      isConnected: false,
      isMuted: false,
      isVideoEnabled: true,
      callType: 'audio',
      status: '',
      callerName: '',
      callerAvatar: '',
      callId: null,
      callDuration: 0
    });
    setCallNotificationSent(false);
  };

  const stopRecordingStream = () => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const clearRecordingPreview = () => {
    if (recordingPreview?.url) {
      cleanupObjectUrl(recordingPreview.url);
    }
    setRecordingPreview(null);
  };

  const resetRecordingState = ({ keepPreview = false } = {}) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      mediaRecorderRef.current = null;
    }

    clearRecordingTimer();
    stopRecordingStream();
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    recordingMimeTypeRef.current = '';
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordingTimeLeft(MAX_VOICE_DURATION_SECONDS);

    if (!keepPreview) {
      clearRecordingPreview();
    }
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
      Object.values(voiceAudioRefs.current).forEach((audioElement) => {
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
        }
      });
      voiceAudioRefs.current = {};
      resetRecordingState();
      resetCallState();
    };
  }, []);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStreamRef.current || null;
  }, [callState.isOpen, callState.isVideoEnabled]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStreamRef.current || null;
  }, [callState.isOpen, callState.isConnected]);

  const createPeerConnection = (targetUserId) => {
    cleanupPeerConnection();

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && targetUserId) {
        socket.emit('ice_candidate', {
          toUserId: targetUserId,
          fromUserId: currentUser._id || currentUser.id,
          candidate: event.candidate
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === 'connected') {
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }

        if (!callStartTimeRef.current) {
          callStartTimeRef.current = Date.now();
        }

        callStatusRef.current.isConnected = true;
        callStatusRef.current.isIncoming = false;

        setCallState((prev) => ({
          ...prev,
          isConnected: true,
          isIncoming: false,
          status: 'Connected'
        }));
        startCallDurationTimer();
      }

      if (['disconnected', 'failed', 'closed'].includes(state)) {
        setCallState((prev) => ({
          ...prev,
          status: prev.isConnected ? 'Call ended' : 'Connection failed'
        }));
      }
    };

    peerConnectionRef.current = peerConnection;
    currentCallUserIdRef.current = targetUserId;

    return peerConnection;
  };

  const getMediaStream = async (callType) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error getting media stream:', error);
      let errorMessage = 'Unable to access microphone/camera';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please allow access to microphone/camera.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone/camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Could not access microphone/camera. It may be in use by another application.';
      }

      throw new Error(errorMessage);
    }
  };

  const attachLocalTracks = (peerConnection, stream) => {
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
  };

  useEffect(() => {
    if (!socket || !selectedUser) return;

    if (messageText.trim().length > 0) {
      socket.emit('typing', {
        senderId: currentUser._id || currentUser.id,
        receiverId: selectedUser._id || selectedUser.id
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', {
          senderId: currentUser._id || currentUser.id,
          receiverId: selectedUser._id || selectedUser.id
        });
      }, 3000);
    } else {
      socket.emit('stop_typing', {
        senderId: currentUser._id || currentUser.id,
        receiverId: selectedUser._id || selectedUser.id
      });
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [messageText, socket, selectedUser, currentUser]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleIncomingCall = ({ callId, fromUserId, fromUserName, fromUserAvatar, callType, offer }) => {
      if (callStatusRef.current.isOpen && callStatusRef.current.isConnected) {
        socket.emit('reject_call', {
          toUserId: fromUserId,
          fromUserId: currentUser._id || currentUser.id,
          callId,
          reason: 'busy'
        });
        return;
      }

      pendingOfferRef.current = offer;
      currentCallUserIdRef.current = fromUserId;
      callStartTimeRef.current = Date.now();

      setCallState({
        isOpen: true,
        isIncoming: true,
        isConnected: false,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        callType,
        status: callType === 'video' ? 'Incoming video call' : 'Incoming audio call',
        callerName: fromUserName || 'Unknown User',
        callerAvatar: fromUserAvatar || '',
        callId,
        callDuration: 0
      });

      callStatusRef.current = {
        isOpen: true,
        isIncoming: true,
        isConnected: false
      };

      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current.isOpen && callStatusRef.current.isIncoming && !callStatusRef.current.isConnected) {
          socket.emit('reject_call', {
            toUserId: fromUserId,
            fromUserId: currentUser._id || currentUser.id,
            callId,
            reason: 'no_answer'
          });
          resetCallState();
          showCallNotification('info', 'CALL MISSED', `Missed ${callType} call from ${fromUserName}`);
        }
      }, 45000);
    };

    const handleCallAnswered = async ({ fromUserId, answer }) => {
      if (!peerConnectionRef.current || currentCallUserIdRef.current?.toString() !== fromUserId.toString()) {
        return;
      }

      try {
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        callStartTimeRef.current = Date.now();

        setCallState((prev) => ({
          ...prev,
          status: 'Connected',
          isConnected: true,
          isIncoming: false,
          callDuration: 0
        }));

        callStatusRef.current.isConnected = true;
        callStatusRef.current.isIncoming = false;

        startCallDurationTimer();
      } catch (error) {
        console.error('Error applying remote answer:', error);
        showCallNotification('error', 'CALL FAILED', 'Could not connect the call.');
        resetCallState();
      }
    };

    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      if (!peerConnectionRef.current || !candidate || currentCallUserIdRef.current?.toString() !== fromUserId.toString()) {
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    const handleCallRejected = ({ reason }) => {
      const message = reason === 'busy' ? 'User is busy on another call.' : 'Call was rejected or missed.';
      if (!callNotificationSent) {
        showCallNotification('info', 'CALL ENDED', message);
        setCallNotificationSent(true);
      }
      resetCallState();
    };

    const handleCallEnded = () => {
      if (!callNotificationSent) {
        showCallNotification('success', 'CALL ENDED', 'The call has ended.');
        setCallNotificationSent(true);
      }
      resetCallState();
    };

    const handleCallBusy = () => {
      showCallNotification('info', 'USER BUSY', 'This user is already on another call.');
      resetCallState();
    };

    const handleCallError = ({ message }) => {
      showCallNotification('error', 'CALL FAILED', message || 'Unable to connect the call.');
      resetCallState();
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_busy', handleCallBusy);
    socket.on('call_error', handleCallError);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_busy', handleCallBusy);
      socket.off('call_error', handleCallError);
    };
  }, [socket, currentUser]);

  const startCall = async (callType) => {
    if (!socket || !selectedUser || selectedGroup) return;

    const targetUserId = selectedUser._id || selectedUser.id;

    try {
      const stream = await getMediaStream(callType);
      const peerConnection = createPeerConnection(targetUserId);

      attachLocalTracks(peerConnection, stream);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      callStartTimeRef.current = Date.now();
      const handleCallInitiated = ({ callId: receivedCallId }) => {
        setCallState((prev) => ({
          ...prev,
          callId: receivedCallId
        }));
      };

      socket.once('call_initiated', handleCallInitiated);

      setCallState({
        isOpen: true,
        isIncoming: false,
        isConnected: false,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        callType,
        status: 'Calling...',
        callerName: selectedUser.username,
        callerAvatar: selectedUser.profilePicture || '',
        callId: null,
        callDuration: 0
      });

      callStatusRef.current = {
        isOpen: true,
        isIncoming: false,
        isConnected: false
      };

      socket.emit('call_user', {
        toUserId: targetUserId,
        fromUserId: currentUser._id || currentUser.id,
        fromUserName: currentUser.username,
        fromUserAvatar: currentUser.profilePicture || '',
        callType,
        offer
      });

      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current.isOpen && !callStatusRef.current.isConnected && !callStatusRef.current.isIncoming) {
          socket.emit('end_call', {
            toUserId: targetUserId,
            fromUserId: currentUser._id || currentUser.id,
            callId: callState.callId,
            duration: 0,
            reason: 'no_answer'
          });
          resetCallState();
          showCallNotification('info', 'NO ANSWER', 'The call went unanswered.');
        }
      }, 45000);
    } catch (error) {
      console.error(`Error starting ${callType} call:`, error);
      const errorMessage = error.message || `Unable to start ${callType} call. Please allow microphone/camera access.`;
      showCallNotification('error', 'CALL FAILED', errorMessage);
      resetCallState();
    }
  };

  const answerIncomingCall = async () => {
    if (!socket || !pendingOfferRef.current || !currentCallUserIdRef.current) return;

    try {
      const stream = await getMediaStream(callState.callType);
      const peerConnection = createPeerConnection(currentCallUserIdRef.current);

      attachLocalTracks(peerConnection, stream);

      await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer_call', {
        toUserId: currentCallUserIdRef.current,
        fromUserId: currentUser._id || currentUser.id,
        callId: callState.callId,
        answer,
        callType: callState.callType
      });

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      callStartTimeRef.current = Date.now();
      callStatusRef.current.isIncoming = false;
      callStatusRef.current.isConnected = true;
      startCallDurationTimer();

      setCallState((prev) => ({
        ...prev,
        isIncoming: false,
        isConnected: true,
        status: 'Connected',
        callDuration: 0
      }));
    } catch (error) {
      console.error('Error answering call:', error);
      const errorMessage = error.message || 'Unable to answer the call.';
      showCallNotification('error', 'CALL FAILED', errorMessage);
      rejectIncomingCall('failed');
    }
  };

  const rejectIncomingCall = (reason = 'rejected') => {
    if (socket && currentCallUserIdRef.current) {
      socket.emit('reject_call', {
        toUserId: currentCallUserIdRef.current,
        fromUserId: currentUser._id || currentUser.id,
        callId: callState.callId,
        reason
      });
    }
    resetCallState();
  };

  const endCall = () => {
    if (socket && currentCallUserIdRef.current) {
      socket.emit('end_call', {
        toUserId: currentCallUserIdRef.current,
        fromUserId: currentUser._id || currentUser.id,
        callId: callState.callId,
        duration: callState.callDuration,
        reason: 'ended'
      });
    }
    resetCallState();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const nextMuted = !callState.isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setCallState((prev) => ({
      ...prev,
      isMuted: nextMuted
    }));
  };

  const toggleVideo = () => {
    if (callState.callType !== 'video' || !localStreamRef.current) return;

    const nextVideoEnabled = !callState.isVideoEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextVideoEnabled;
    });

    setCallState((prev) => ({
      ...prev,
      isVideoEnabled: nextVideoEnabled
    }));
  };

  const getSearchableMessageText = (msg) => {
    const parts = [];

    if (msg.content) parts.push(msg.content);
    if (msg.fileName) parts.push(msg.fileName);

    if (msg.messageType === 'voice') parts.push('voice message');
    if (msg.messageType === 'audio') parts.push('audio file');
    if (msg.messageType === 'image') parts.push('photo image media');
    if (msg.messageType === 'video') parts.push('video media');
    if (msg.messageType === 'document') parts.push('document file attachment');
    if (msg.messageType === 'call') {
      parts.push(msg.callType === 'video' ? 'video call' : 'audio call');
      if (msg.callStatus) parts.push(msg.callStatus);
    }

    return parts.join(' ').trim();
  };

  const filteredSearchMatches = searchQuery.trim()
    ? messages.reduce((matches, msg, index) => {
        const searchableText = getSearchableMessageText(msg);
        if (!searchableText) return matches;

        const normalizedContent = searchableText.toLowerCase();
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (normalizedContent.includes(normalizedQuery)) {
          matches.push({
            index,
            messageId: msg._id || msg.id
          });
        }

        return matches;
      }, [])
    : [];

  const activeSearchMatch = filteredSearchMatches[activeSearchIndex] || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSearchMatch = (match) => {
    if (!match) return;
    const targetMessage = messageRefs.current[match.messageId];
    if (targetMessage) {
      targetMessage.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  useEffect(() => {
    if (!showSearchBar || !searchQuery.trim() || filteredSearchMatches.length === 0) {
      scrollToBottom();
    }
  }, [messages, recordingPreview]);

  useEffect(() => {
    if (!showSearchBar) return;

    if (!searchQuery.trim()) {
      setActiveSearchIndex(0);
      return;
    }

    if (filteredSearchMatches.length === 0) {
      setActiveSearchIndex(0);
      return;
    }

    if (activeSearchIndex > filteredSearchMatches.length - 1) {
      setActiveSearchIndex(0);
    }
  }, [searchQuery, filteredSearchMatches.length, activeSearchIndex, showSearchBar]);

  useEffect(() => {
    if (!showSearchBar || !searchQuery.trim() || filteredSearchMatches.length === 0) return;
    scrollToSearchMatch(activeSearchMatch);
  }, [activeSearchIndex, activeSearchMatch, filteredSearchMatches.length, showSearchBar, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachments(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
      setShowEmojiPicker(false);
    }
  };

  const handleToggleSearch = () => {
    setShowSearchBar((prev) => {
      const nextValue = !prev;

      if (!nextValue) {
        setSearchQuery('');
        setActiveSearchIndex(0);
      }

      return nextValue;
    });
    setShowDropdown(false);
  };

  const handleSearchNavigation = (direction) => {
    if (filteredSearchMatches.length === 0) return;

    setActiveSearchIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % filteredSearchMatches.length;
      }

      return (prev - 1 + filteredSearchMatches.length) % filteredSearchMatches.length;
    });
  };

  const highlightMessageText = (content) => {
    if (!content || !searchQuery.trim()) return content;

    const normalizedQuery = searchQuery.trim();
    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    const parts = content.split(regex);

    return parts.map((part, index) => (
      part.toLowerCase() === normalizedQuery.toLowerCase() ? (
        <mark key={`${part}-${index}`} className="message-search-highlight">
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      )
    ));
  };

  const getSearchResultLabel = (msg) => {
    if (msg.messageType === 'call') {
      return msg.callType === 'video' ? 'Video call' : 'Audio call';
    }

    if (msg.messageType === 'voice') return 'Voice message';
    if (msg.messageType === 'audio') return 'Audio file';
    if (msg.messageType === 'image') return 'Photo';
    if (msg.messageType === 'video') return 'Video';
    if (msg.messageType === 'document') return 'Document';
    return '';
  };

  const onEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const getAttachmentType = (file) => {
    if (!file) return 'document';
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type?.startsWith('video/')) return 'video';
    if (file.type?.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getDisplayFileName = (msg) => {
    if (msg.fileName && msg.fileName.trim()) return msg.fileName;
    if (msg.content && msg.content.trim()) return msg.content;
    const normalizedUrl = normalizeFileUrl(msg.fileUrl || '');
    const fileUrlParts = normalizedUrl.split('/') || [];
    return fileUrlParts[fileUrlParts.length - 1] || 'attachment';
  };

  const getFileUrl = (msg) => normalizeFileUrl(msg.fileUrl || '');

  const formatFileSize = (fileSize) => {
    if (!fileSize) return '';
    if (fileSize < 1024) return `${fileSize} B`;
    if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(2)} KB`;
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  };

  const resetInputValue = (inputRef) => {
    if (inputRef?.current) {
      inputRef.current.value = '';
    }
  };

  const createObjectUrl = (file) => {
    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(objectUrl);
    return objectUrl;
  };

  const cleanupObjectUrl = (url) => {
    if (url && url.startsWith('blob:') && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const updateVoicePlaybackState = (messageId, partialState) => {
    setVoicePlayback((prev) => ({
      ...prev,
      [messageId]: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
        ...prev[messageId],
        ...partialState
      }
    }));
  };

  const handleVoiceAudioRef = (messageId, element) => {
    if (element) {
      voiceAudioRefs.current[messageId] = element;
    } else {
      delete voiceAudioRefs.current[messageId];
    }
  };

  const pauseActiveVoiceMessage = (excludedMessageId = null) => {
    if (!activeVoiceMessageId) return;

    if (excludedMessageId && activeVoiceMessageId === excludedMessageId) {
      return;
    }

    const activeAudio = voiceAudioRefs.current[activeVoiceMessageId];
    if (activeAudio) {
      activeAudio.pause();
    }
  };

  const handleVoiceLoadedMetadata = (messageId, event, fallbackDuration = 0) => {
    const audioDuration = Number.isFinite(event.target.duration) && event.target.duration > 0
      ? event.target.duration
      : fallbackDuration;

    updateVoicePlaybackState(messageId, {
      duration: audioDuration,
      progress: audioDuration ? ((voicePlayback[messageId]?.currentTime || 0) / audioDuration) * 100 : 0
    });
  };

  const handleVoiceTimeUpdate = (messageId, event) => {
    const duration = Number.isFinite(event.target.duration) && event.target.duration > 0
      ? event.target.duration
      : 0;
    const currentTime = event.target.currentTime || 0;
    updateVoicePlaybackState(messageId, {
      currentTime,
      duration,
      progress: duration ? (currentTime / duration) * 100 : 0
    });
  };

  const handleVoicePlay = (messageId) => {
    pauseActiveVoiceMessage(messageId);
    setActiveVoiceMessageId(messageId);
    updateVoicePlaybackState(messageId, { isPlaying: true });
  };

  const handleVoicePause = (messageId) => {
    if (activeVoiceMessageId === messageId) {
      setActiveVoiceMessageId(null);
    }
    updateVoicePlaybackState(messageId, { isPlaying: false });
  };

  const handleVoiceEnded = (messageId) => {
    if (activeVoiceMessageId === messageId) {
      setActiveVoiceMessageId(null);
    }
    updateVoicePlaybackState(messageId, {
      isPlaying: false,
      currentTime: 0,
      progress: 0
    });
  };

  const toggleVoicePlayback = (messageId) => {
    const audioElement = voiceAudioRefs.current[messageId];
    if (!audioElement) return;

    if (audioElement.paused) {
      pauseActiveVoiceMessage(messageId);
      audioElement.play().catch((error) => {
        console.error('Unable to play voice message:', error);
        setNotificationData({
          type: 'error',
          title: 'PLAYBACK FAILED',
          message: 'Unable to play this voice message.'
        });
        setShowNotification(true);
      });
      return;
    }

    audioElement.pause();
  };

  const handleVoiceSeek = (messageId, nextProgress) => {
    const audioElement = voiceAudioRefs.current[messageId];
    if (!audioElement || !audioElement.duration) return;

    const clampedProgress = Math.min(100, Math.max(0, nextProgress));
    audioElement.currentTime = (audioElement.duration * clampedProgress) / 100;
  };

  const sendVoiceMessage = async () => {
    if (!recordingPreview?.blob || !selectedUser) return;

    const voiceDurationSeconds = Math.max(1, Math.round(recordingPreview.duration || 0));
    const fileExtension = recordingPreview.extension || 'webm';
    const fileName = `voice-message-${Date.now()}.${fileExtension}`;
    const currentUserId = currentUser._id || currentUser.id;
    const selectedId = selectedUser._id || selectedUser.id;
    const optimisticId = `temp_voice_${Date.now()}`;

    const voiceFile = new File([recordingPreview.blob], fileName, {
      type: recordingPreview.mimeType || 'audio/webm'
    });

    const optimisticMessage = {
      _id: optimisticId,
      sender: currentUserId,
      receiver: selectedId,
      content: 'Voice message',
      messageType: 'voice',
      fileUrl: recordingPreview.url,
      fileName,
      fileSize: voiceFile.size,
      fileDuration: voiceDurationSeconds,
      timestamp: new Date(),
      isOptimistic: true
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const formData = new FormData();
    formData.append('sender', currentUserId);
    formData.append('receiver', selectedId);
    formData.append('content', 'Voice message');
    formData.append('messageType', 'voice');
    formData.append('fileName', fileName);
    formData.append('fileSize', voiceFile.size);
    formData.append('fileDuration', voiceDurationSeconds);
    formData.append('attachment', voiceFile);

    const previewUrlToCleanup = recordingPreview.url;
    setRecordingPreview(null);

    try {
      const response = await messageAPI.sendAttachment(formData);
      cleanupObjectUrl(previewUrlToCleanup);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === optimisticId ? response.data : msg))
      );

      if (socket) {
        socket.emit('send_message', response.data);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      cleanupObjectUrl(previewUrlToCleanup);
      setMessages((prev) => prev.filter((msg) => msg._id !== optimisticId));
      setNotificationData({
        type: 'error',
        title: 'VOICE MESSAGE FAILED',
        message: error?.response?.data?.error || 'Unable to send voice message. Please try again.'
      });
      setShowNotification(true);
    } finally {
      resetRecordingState();
    }
  };

  const finalizeRecording = (shouldKeepPreview = true) => {
    if (!mediaRecorderRef.current) return;

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    clearRecordingTimer();

    if (!shouldKeepPreview) {
      clearRecordingPreview();
    }
  };

  const cancelVoiceRecording = () => {
    clearRecordingPreview();
    resetRecordingState();
  };

  const toggleRecordingPause = () => {
    if (!mediaRecorderRef.current) return;

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearRecordingTimer();
      setIsRecording(false);
      return;
    }

    if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      recordingStartedAtRef.current = Date.now() - (recordingDuration * 1000);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        const elapsedSeconds = Math.min(
          MAX_VOICE_DURATION_SECONDS,
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        );
        setRecordingDuration(elapsedSeconds);
        setRecordingTimeLeft(MAX_VOICE_DURATION_SECONDS - elapsedSeconds);

        if (elapsedSeconds >= MAX_VOICE_DURATION_SECONDS) {
          finalizeRecording(true);
        }
      }, 250);
    }
  };

  const startVoiceRecording = async () => {
    if (!selectedUser) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotificationData({
        type: 'error',
        title: 'VOICE MESSAGE NOT SUPPORTED',
        message: 'Your browser does not support voice recording.'
      });
      setShowNotification(true);
      return;
    }

    try {
      clearRecordingPreview();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      recordingMimeTypeRef.current = mimeType || mediaRecorder.mimeType || 'audio/webm';
      recordingStartedAtRef.current = Date.now();
      setRecordingDuration(0);
      setRecordingTimeLeft(MAX_VOICE_DURATION_SECONDS);
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('Voice recording error:', event.error);
        setNotificationData({
          type: 'error',
          title: 'RECORDING FAILED',
          message: 'Unable to record voice message.'
        });
        setShowNotification(true);
        resetRecordingState();
      };

      mediaRecorder.onstop = () => {
        const durationMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0;
        const hasValidRecording = recordingChunksRef.current.length > 0 && durationMs >= MIN_VOICE_DURATION_MS;

        stopRecordingStream();
        clearRecordingTimer();

        if (!hasValidRecording) {
          resetRecordingState();
          setNotificationData({
            type: 'info',
            title: 'VOICE MESSAGE TOO SHORT',
            message: 'Hold the mic a bit longer to send a voice message.'
          });
          setShowNotification(true);
          return;
        }

        const resolvedMimeType = recordingMimeTypeRef.current || 'audio/webm';
        const extension = resolvedMimeType.includes('mp4') ? 'm4a' : resolvedMimeType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: resolvedMimeType });
        const previewUrl = createObjectUrl(blob);
        const durationSeconds = Math.max(1, Math.round(durationMs / 1000));

        setRecordingPreview({
          blob,
          url: previewUrl,
          duration: durationSeconds,
          mimeType: resolvedMimeType,
          extension
        });

        setRecordingDuration(durationSeconds);
        setRecordingTimeLeft(Math.max(0, MAX_VOICE_DURATION_SECONDS - durationSeconds));
      };

      mediaRecorder.start(250);

      recordingTimerRef.current = setInterval(() => {
        const elapsedSeconds = Math.min(
          MAX_VOICE_DURATION_SECONDS,
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        );
        setRecordingDuration(elapsedSeconds);
        setRecordingTimeLeft(MAX_VOICE_DURATION_SECONDS - elapsedSeconds);

        if (elapsedSeconds >= MAX_VOICE_DURATION_SECONDS) {
          finalizeRecording(true);
        }
      }, 250);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      let errorMessage = 'Unable to access your microphone.';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission was denied. Please allow microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone was found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is currently being used by another application.';
      }

      setNotificationData({
        type: 'error',
        title: 'MICROPHONE UNAVAILABLE',
        message: errorMessage
      });
      setShowNotification(true);
      resetRecordingState();
    }
  };

  const handleAttachmentSelect = async (requestedType, file, inputRef) => {
    if (!file || !selectedUser) {
      resetInputValue(inputRef);
      return;
    }

    const resolvedType = requestedType === 'auto' ? getAttachmentType(file) : requestedType;
    const optimisticId = `temp_${Date.now()}_${file.name}`;
    const objectUrl = createObjectUrl(file);
    const maxFileSize = 25 * 1024 * 1024;

    if (file.size > maxFileSize) {
      cleanupObjectUrl(objectUrl);
      resetInputValue(inputRef);
      setShowAttachments(false);
      setNotificationData({
        type: 'error',
        title: 'FILE TOO LARGE',
        message: 'Attachments must be 25 MB or smaller.'
      });
      setShowNotification(true);
      return;
    }

    try {
      const optimisticMessage = {
        _id: optimisticId,
        sender: currentUser._id || currentUser.id,
        receiver: selectedUser._id || selectedUser.id,
        content: file.name,
        messageType: resolvedType,
        fileUrl: objectUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date(),
        isOptimistic: true
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setShowAttachments(false);

      const formData = new FormData();
      formData.append('sender', currentUser._id || currentUser.id);
      formData.append('receiver', selectedUser._id || selectedUser.id);
      formData.append('content', file.name);
      formData.append('messageType', resolvedType);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size);
      formData.append('attachment', file);

      const response = await messageAPI.sendAttachment(formData);

      if (response.data) {
        cleanupObjectUrl(objectUrl);
        setMessages(prev =>
          prev.map(msg =>
            msg._id === optimisticId ? response.data : msg
          )
        );

        if (socket) {
          socket.emit('send_message', response.data);
        }
      }
    } catch (error) {
      console.error(`Error sending ${resolvedType}:`, error);
      cleanupObjectUrl(objectUrl);
      setMessages(prev => prev.filter(msg => msg._id !== optimisticId));
      setNotificationData({
        type: 'error',
        title: 'UPLOAD FAILED',
        message: error?.response?.data?.error || `Failed to send ${resolvedType}. Please try again.`
      });
      setShowNotification(true);
    } finally {
      resetInputValue(inputRef);
    }
  };

  const handlePhotosVideos = () => {
    photoVideoInputRef.current?.click();
  };

  const handleAudio = () => {
    audioInputRef.current?.click();
  };

  const handleDocument = () => {
    documentInputRef.current?.click();
  };

  const handleContactInfo = () => {
    setShowContactInfo(true);
    setShowDropdown(false);
  };

  const handleClearChat = () => {
    setShowClearConfirmation(true);
  };

  const handleConfirmClear = async () => {
    setIsLoadingAction(true);
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      if (setMessages) setMessages([]);
      if (onClearChat) onClearChat();
      setShowDropdown(false);
      setShowClearConfirmation(false);
      setNotificationData({
        type: 'success',
        title: 'SUCCESS',
        message: 'Chat cleared successfully'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error clearing chat:', error);
      setShowClearConfirmation(false);
      setNotificationData({
        type: 'error',
        title: 'ERROR',
        message: 'Failed to clear chat'
      });
      setShowNotification(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteChat = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoadingAction(true);
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      if (onDeleteChat) {
        onDeleteChat(selectedId);
      }
      setShowDropdown(false);
      setShowDeleteConfirmation(false);
      setNotificationData({
        type: 'success',
        title: 'SUCCESS',
        message: 'Conversation deleted successfully'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setShowDeleteConfirmation(false);
      setNotificationData({
        type: 'error',
        title: 'ERROR',
        message: 'Failed to delete conversation'
      });
      setShowNotification(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleLeaveGroup = () => {
    setShowLeaveGroupConfirmation(true);
  };

  const handleConfirmLeaveGroup = async () => {
    setIsLoadingAction(true);
    try {
      const groupId = selectedGroup._id || selectedGroup.id;
      await groupAPI.leaveGroup(groupId);
      if (onLeaveGroup) {
        onLeaveGroup(groupId);
      }
      setShowDropdown(false);
      setShowLeaveGroupConfirmation(false);
      setNotificationData({
        type: 'success',
        title: 'SUCCESS',
        message: 'Left group successfully'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error leaving group:', error);
      setShowLeaveGroupConfirmation(false);
      setNotificationData({
        type: 'error',
        title: 'ERROR',
        message: 'Failed to leave group'
      });
      setShowNotification(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const renderVoiceMessage = (msg) => {
    const messageId = msg._id || msg.id;
    const playbackState = voicePlayback[messageId] || {};
    const duration = playbackState.duration || msg.fileDuration || 0;
    const currentTime = playbackState.currentTime || 0;
    const progress = playbackState.progress || 0;
    const isPlaying = Boolean(playbackState.isPlaying);

    return (
      <div className="voice-message-card">
        <button
          type="button"
          className={`voice-message-play ${isPlaying ? 'playing' : ''}`}
          onClick={() => toggleVoicePlayback(messageId)}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <MdPause size={22} /> : <MdPlayArrow size={22} />}
        </button>

        <div className="voice-message-body">
          <div className="voice-waveform" onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const clickPosition = event.clientX - rect.left;
            const nextProgress = (clickPosition / rect.width) * 100;
            handleVoiceSeek(messageId, nextProgress);
          }}>
            <div className="voice-waveform-track">
              <div
                className="voice-waveform-progress"
                style={{ width: `${progress}%` }}
              />
              {Array.from({ length: 34 }).map((_, index) => (
                <span
                  key={`${messageId}_wave_${index}`}
                  className={`voice-wave-bar ${progress > (index / 34) * 100 ? 'active' : ''}`}
                  style={{ height: `${10 + ((index * 7) % 18)}px` }}
                />
              ))}
            </div>
          </div>

          <div className="voice-message-footer">
            <span className="voice-message-time-label">
              {formatDuration(currentTime || duration || msg.fileDuration || 0)}
            </span>
            <span className="voice-message-duration">
              {formatDuration(duration || msg.fileDuration || 0)}
            </span>
          </div>
        </div>

        <audio
          ref={(element) => handleVoiceAudioRef(messageId, element)}
          src={getFileUrl(msg)}
          preload="metadata"
          onLoadedMetadata={(event) => handleVoiceLoadedMetadata(messageId, event, msg.fileDuration || 0)}
          onTimeUpdate={(event) => handleVoiceTimeUpdate(messageId, event)}
          onPlay={() => handleVoicePlay(messageId)}
          onPause={() => handleVoicePause(messageId)}
          onEnded={() => handleVoiceEnded(messageId)}
          className="voice-message-audio-hidden"
        />
      </div>
    );
  };

  const renderAttachmentMessage = (msg) => {
    const fileUrl = getFileUrl(msg);
    const displayFileName = getDisplayFileName(msg);

    if (msg.messageType === 'image' || msg.messageType === 'video') {
      return (
        <div className="media-preview">
          {getSearchResultLabel(msg) && (
            <div className="attachment-search-label">{highlightMessageText(getSearchResultLabel(msg))}</div>
          )}
          {msg.messageType === 'image' ? (
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <img
                src={fileUrl}
                alt={displayFileName}
                className="message-media"
              />
            </a>
          ) : (
            <video className="message-media" controls preload="metadata">
              <source src={fileUrl} />
              Your browser does not support the video tag.
            </video>
          )}
          <div className="media-filename">{highlightMessageText(displayFileName)}</div>
          <div className="document-preview">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
              <MdOpenInNew size={16} /> Open
            </a>
            <a href={fileUrl} download={displayFileName} className="document-link">
              <MdDownload size={16} /> Download
            </a>
          </div>
        </div>
      );
    }

    if (msg.messageType === 'voice') {
      return renderVoiceMessage(msg);
    }

    if (msg.messageType === 'audio') {
      return (
        <div className="audio-preview">
          {getSearchResultLabel(msg) && (
            <div className="attachment-search-label">{highlightMessageText(getSearchResultLabel(msg))}</div>
          )}
          <div className="audio-filename">{highlightMessageText(displayFileName)}</div>
          <audio controls preload="metadata" className="message-audio">
            <source src={fileUrl} />
            Your browser does not support the audio element.
          </audio>
          <div className="file-size">{formatFileSize(msg.fileSize)}</div>
        </div>
      );
    }

    return (
      <div className="document-preview">
        <FaFileLines size={24} className="document-icon" />
        <div className="document-info">
          {getSearchResultLabel(msg) && (
            <div className="attachment-search-label">{highlightMessageText(getSearchResultLabel(msg))}</div>
          )}
          <div className="document-filename">{highlightMessageText(displayFileName)}</div>
          <div className="file-size">{formatFileSize(msg.fileSize)}</div>
          <div className="document-actions">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
              <MdOpenInNew size={16} /> Open
            </a>
            <a href={fileUrl} download={displayFileName} className="document-link">
              <MdDownload size={16} /> Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderCallMessage = (msg) => {
    const isMissed = msg.callStatus === 'missed';
    const callTypeLabel = msg.callType === 'video' ? 'Video call' : 'Audio call';

    return (
      <div className={`call-message ${isMissed ? 'missed' : 'completed'}`}>
        <div className="call-message-icon">
          {msg.callType === 'video' ? <MdVideoCall size={20} /> : <MdCall size={20} />}
        </div>
        <div className="call-message-content">
          <div className="call-message-type">
            {isMissed ? (
              <span className="call-status-missed">{highlightMessageText(`Missed ${callTypeLabel}`)}</span>
            ) : (
              <span className="call-status-completed">{highlightMessageText(callTypeLabel)}</span>
            )}
          </div>
          {msg.callDuration && msg.callDuration > 0 && (
            <div className="call-message-duration">
              {Math.floor(msg.callDuration / 60)}:{String(msg.callDuration % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-window-wrapper">
      <div className="chat-window">
        <div className="chat-window-header">
          <div className="chat-window-user-info">
            <div className="chat-window-avatar" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
              {selectedGroup ? (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
                  👥
                </div>
              ) : selectedUser?.profilePicture ? (
                <img src={selectedUser.profilePicture} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedUser?.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="chat-window-user-details" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
              <h3>{selectedGroup ? selectedGroup.name : selectedUser?.username}</h3>
              {selectedGroup ? (
                <p className="group-members">{selectedGroup.members?.length || 0} members</p>
              ) : isTyping ? (
                <p className="typing-indicator">typing...</p>
              ) : (
                <div className="presence-status">
                  <span className={`presence-dot ${selectedUser?.status === 'online' ? 'online' : 'offline'}`}></span>
                  <p className={`presence-text ${selectedUser?.status === 'online' ? 'online' : 'offline'}`}>
                    {selectedUser?.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="chat-window-header-actions">
            {!selectedGroup && (
              <>
                <button className="icon-button" onClick={() => startCall('video')} title="Video call">
                  <MdVideoCall size={26} />
                </button>
                <button className="icon-button" onClick={() => startCall('audio')} title="Audio call">
                  <MdCall size={22} />
                </button>
              </>
            )}
            <div className="divider"></div>
            <button className={`icon-button ${showSearchBar ? 'active' : ''}`} onClick={handleToggleSearch} title="Search messages">
              <MdSearch size={22} />
            </button>
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <button
                className={`icon-button ${showDropdown ? 'active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MdMoreVert size={22} />
              </button>
              {showDropdown && (
                <div className="chat-window-dropdown">
                  {!selectedGroup && selectedUser && (
                    <div className="dropdown-item" onClick={(e) => { toggleFavourite(selectedUser._id || selectedUser.id, e); setShowDropdown(false); }}>
                      {favourites.includes(selectedUser._id || selectedUser.id) ? (
                        <><MdStar className="menu-icon" style={{ color: '#00a884' }} /> Remove favourite</>
                      ) : (
                        <><MdStarBorder className="menu-icon" /> Add to favourites</>
                      )}
                    </div>
                  )}
                  <div className="dropdown-item" onClick={handleContactInfo}>
                    <IoMdInformationCircleOutline className="menu-icon" /> {selectedGroup ? 'Group info' : 'Contact info'}
                  </div>
                  <div className="dropdown-item" onClick={handleClearChat}>
                    <AiOutlineClear className="menu-icon" /> Clear chat
                  </div>
                  {selectedGroup && (
                    <div className="dropdown-item delete" onClick={handleLeaveGroup}>
                      <MdArrowBack className="menu-icon" /> Leave group
                    </div>
                  )}
                  <div className="dropdown-item delete" onClick={handleDeleteChat}>
                    <MdDeleteOutline className="menu-icon" /> Delete chat
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showSearchBar && (
          <div className="chat-search-bar">
            <div className="chat-search-input-wrapper">
              <MdSearch size={20} className="chat-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, media, documents"
                className="chat-search-input"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="chat-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveSearchIndex(0);
                  }}
                  aria-label="Clear search"
                >
                  <MdClose size={18} />
                </button>
              )}
            </div>
            <div className="chat-search-meta">
              <span className="chat-search-count">
                {searchQuery.trim()
                  ? `${filteredSearchMatches.length ? activeSearchIndex + 1 : 0}/${filteredSearchMatches.length}`
                  : 'Search'}
              </span>
              <button
                type="button"
                className="chat-search-nav"
                onClick={() => handleSearchNavigation('prev')}
                disabled={filteredSearchMatches.length === 0}
                aria-label="Previous result"
              >
                <MdKeyboardArrowUp size={22} />
              </button>
              <button
                type="button"
                className="chat-search-nav"
                onClick={() => handleSearchNavigation('next')}
                disabled={filteredSearchMatches.length === 0}
                aria-label="Next result"
              >
                <MdKeyboardArrowDown size={22} />
              </button>
              <button
                type="button"
                className="chat-search-close"
                onClick={handleToggleSearch}
                aria-label="Close search"
              >
                <MdClose size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const messageId = msg._id || msg.id;
              const isMatchedMessage = filteredSearchMatches.some((match) => match.messageId === messageId);
              const isActiveMatchedMessage = activeSearchMatch?.messageId === messageId;

              // Check if we need to show date separator
              const previousMsg = index > 0 ? messages[index - 1] : null;
              const currentMsgDate = new Date(msg.timestamp).toDateString();
              const previousMsgDate = previousMsg ? new Date(previousMsg.timestamp).toDateString() : null;
              const shouldShowDateSeparator = !previousMsg || currentMsgDate !== previousMsgDate;

              return (
                <React.Fragment key={`${messageId}-wrapper`}>
                  {shouldShowDateSeparator && (
                    <div className="date-separator">
                      <span className="date-separator-text">{formatDateSeparator(msg.timestamp)}</span>
                    </div>
                  )}
                  <div
                    key={messageId}
                    ref={(element) => {
                      if (element) {
                        messageRefs.current[messageId] = element;
                      } else {
                        delete messageRefs.current[messageId];
                      }
                    }}
                    className={`message ${(msg.sender._id || msg.sender).toString() === (currentUser._id || currentUser.id).toString() ? 'sent' : 'received'} ${isMatchedMessage ? 'search-match' : ''} ${isActiveMatchedMessage ? 'search-match-active' : ''}`}
                  >
                    <div className="message-content">
                      {msg.messageType === 'call' ? (
                        <div className="call-message-wrapper">
                          {renderCallMessage(msg)}
                        </div>
                      ) : msg.messageType && msg.messageType !== 'text' ? (
                        <div className={`attachment-message attachment-${msg.messageType}`}>
                          {renderAttachmentMessage(msg)}
                        </div>
                      ) : (
                        <p>{highlightMessageText(msg.content)}</p>
                      )}
                      <div className="message-meta">
                        {msg.isOptimistic && (
                          <span className="message-time sending">sending...</span>
                        )}
                        {!msg.isOptimistic && (
                          <>
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {(msg.sender?._id || msg.sender)?.toString() === (currentUser?._id || currentUser?.id)?.toString() && (
                              <span className="tick-icons">
                                {msg.isRead ? (
                                  <BiCheckDouble className="read-receipt" title="Read" />
                                ) : msg.isDelivered ? (
                                  <BiCheckDouble className="delivered-receipt" title="Delivered" />
                                ) : (
                                  <BiCheck className="sent-receipt" title="Sent" />
                                )}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {callState.isOpen && (
          <div className="call-overlay">
            <div className={`call-modal ${callState.callType === 'video' ? 'video' : 'audio'}`}>
              <div className="call-modal-header">
                <div className="call-user-meta">
                  <div className="call-avatar">
                    {callState.callerAvatar ? (
                      <img src={callState.callerAvatar} alt={callState.callerName} />
                    ) : (
                      <span>{(callState.callerName || selectedUser?.username || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3>{callState.callerName || selectedUser?.username}</h3>
                    <p>{callState.status}</p>
                  </div>
                </div>
              </div>

              <div className="call-media-area">
                {callState.callType === 'video' ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      className="remote-video"
                      autoPlay
                      playsInline
                    />
                    <video
                      ref={localVideoRef}
                      className="local-video"
                      autoPlay
                      muted
                      playsInline
                    />
                    {!callState.isConnected && (
                      <div className="call-waiting-badge">
                        {callState.isIncoming ? 'Waiting for answer' : 'Ringing...'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="audio-call-visual">
                    <div className="audio-call-avatar">
                      {callState.callerAvatar ? (
                        <img src={callState.callerAvatar} alt={callState.callerName} />
                      ) : (
                        <span>{(callState.callerName || selectedUser?.username || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="audio-call-label">{callState.status}</p>
                  </div>
                )}
              </div>

              <div className="call-controls">
                {callState.isIncoming ? (
                  <>
                    <button className="call-control-button reject" onClick={() => rejectIncomingCall()}>
                      <MdCallEnd size={24} />
                    </button>
                    <button className="call-control-button accept" onClick={answerIncomingCall}>
                      {callState.callType === 'video' ? <MdVideocam size={24} /> : <MdCall size={24} />}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="call-control-button secondary" onClick={toggleMute}>
                      {callState.isMuted ? <MdMicOff size={22} /> : <MdMic size={22} />}
                    </button>
                    {callState.callType === 'video' && (
                      <button className="call-control-button secondary" onClick={toggleVideo}>
                        {callState.isVideoEnabled ? <MdVideocam size={22} /> : <MdVideocamOff size={22} />}
                      </button>
                    )}
                    <button className="call-control-button reject" onClick={endCall}>
                      <MdCallEnd size={24} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {recordingPreview ? (
          <div className="voice-recording-container voice-preview-container">
            <button type="button" className="recording-trash" onClick={cancelVoiceRecording}>
              <MdDeleteOutline size={24} />
            </button>

            <button
              type="button"
              className="recording-preview-play"
              onClick={() => {
                const previewAudio = voiceAudioRefs.current.voice_preview;
                if (!previewAudio) return;

                if (previewAudio.paused) {
                  previewAudio.play().catch((error) => console.error('Unable to preview voice note:', error));
                } else {
                  previewAudio.pause();
                }
              }}
            >
              {(voicePlayback.voice_preview?.isPlaying) ? <MdPause size={22} /> : <MdPlayArrow size={22} />}
            </button>

            <div className="recording-preview-content">
              <div className="recording-preview-label">
                <MdLock size={14} />
                <span>Voice message preview</span>
              </div>
              <div className="recording-preview-meta">
                <span>{formatDuration(voicePlayback.voice_preview?.currentTime || recordingPreview.duration)}</span>
                <span>{formatDuration(recordingPreview.duration)}</span>
              </div>
              <div className="recording-preview-wave">
                <div className="voice-waveform-track">
                  <div
                    className="voice-waveform-progress"
                    style={{ width: `${voicePlayback.voice_preview?.progress || 0}%` }}
                  />
                  {Array.from({ length: 26 }).map((_, index) => (
                    <span
                      key={`preview_wave_${index}`}
                      className={`voice-wave-bar ${(voicePlayback.voice_preview?.progress || 0) > (index / 26) * 100 ? 'active' : ''}`}
                      style={{ height: `${10 + ((index * 5) % 16)}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <audio
              ref={(element) => handleVoiceAudioRef('voice_preview', element)}
              src={recordingPreview.url}
              preload="metadata"
              onLoadedMetadata={(event) => handleVoiceLoadedMetadata('voice_preview', event, recordingPreview.duration)}
              onTimeUpdate={(event) => handleVoiceTimeUpdate('voice_preview', event)}
              onPlay={() => handleVoicePlay('voice_preview')}
              onPause={() => handleVoicePause('voice_preview')}
              onEnded={() => handleVoiceEnded('voice_preview')}
              className="voice-message-audio-hidden"
            />

            <button type="button" className="send-button voice-send" onClick={sendVoiceMessage}>
              <MdSend size={24} />
            </button>
          </div>
        ) : isRecording || mediaRecorderRef.current?.state === 'paused' ? (
          <div className="voice-recording-container">
            <button type="button" className="recording-trash" onClick={cancelVoiceRecording}>
              <MdDeleteOutline size={24} />
            </button>
            <div className="recording-status">
              <span className="recording-dot"></span>
              <span className="recording-time">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="recording-visualizer">
              {Array.from({ length: 22 }).map((_, index) => (
                <div
                  key={`recording_wave_${index}`}
                  className={`wave-bar ${isRecording ? 'active' : 'paused'}`}
                  style={{ height: `${10 + ((index * 9) % 22)}px` }}
                />
              ))}
            </div>
            <button type="button" className="recording-pause" onClick={toggleRecordingPause}>
              {isRecording ? <MdPause size={24} /> : <MdMic size={24} />}
            </button>
            <div className="recording-once">{formatDuration(recordingTimeLeft)} left</div>
            <button type="button" className="send-button voice-send" onClick={() => finalizeRecording(true)}>
              <MdStop size={24} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="message-input-form">
            <div className="emoji-wrapper" ref={emojiRef}>
              <button
                type="button"
                className={`icon-button ${showEmojiPicker ? 'active' : ''}`}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <BsEmojiSmile size={24} />
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <EmojiPicker onEmojiClick={onEmojiClick} width={350} height={400} />
                </div>
              )}
            </div>
            <div className="attachment-wrapper" ref={attachmentRef}>
              <button
                type="button"
                className={`icon-button ${showAttachments ? 'active' : ''}`}
                onClick={() => setShowAttachments(!showAttachments)}
              >
                {showAttachments ? <BsFillPlusCircleFill size={22} color="#00a884" style={{ transform: 'rotate(45deg)', transition: '0.2s' }} /> : <BsPaperclip size={24} />}
              </button>
              {showAttachments && (
                <div className="attachment-popup">
                  <div className="attach-item document" onClick={handleDocument}><FaFileLines className="attach-icon" /> Document</div>
                  <div className="attach-item photos" onClick={handlePhotosVideos}><FaImage className="attach-icon" /> Photos & videos</div>
                  <div className="attach-item audio" onClick={handleAudio}><FaHeadphones className="attach-icon" /> Audio</div>
                </div>
              )}
              <input
                type="file"
                ref={photoVideoInputRef}
                onChange={(e) => handleAttachmentSelect('auto', e.target.files?.[0], photoVideoInputRef)}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={audioInputRef}
                onChange={(e) => handleAttachmentSelect('audio', e.target.files?.[0], audioInputRef)}
                accept="audio/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={documentInputRef}
                onChange={(e) => handleAttachmentSelect('document', e.target.files?.[0], documentInputRef)}
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.csv,application/*"
                style={{ display: 'none' }}
              />
            </div>

            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message"
              className="message-input"
            />

            {messageText.trim() ? (
              <button type="submit" className="send-button active">
                <MdSend size={24} />
              </button>
            ) : (
              <button type="button" className="send-button" onClick={startVoiceRecording}>
                <BsMic size={24} />
              </button>
            )}
          </form>
        )}
      </div>

      {showContactInfo && (
        <div className="contact-info-sidepanel">
          <div className="contact-drawer-header">
            <div className="contact-drawer-header-content">
              <button className="back-btn" onClick={() => setShowContactInfo(false)}>
                <MdArrowBack size={24} />
              </button>
              <span>{selectedGroup ? 'Group Info' : 'Profile'}</span>
            </div>
          </div>
          <div className="contact-info-content">
            {selectedGroup ? (
              <>
                <div className="contact-photo-section">
                  <div className="contact-photo-large view-only" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '48px' }}>
                    👥
                  </div>
                </div>

                <div className="contact-photo-name">
                  {selectedGroup.name}
                </div>

                <div className="contact-info-section">
                  <label>Description</label>
                  <div className="contact-info-row">
                    <div className="contact-info-text">{selectedGroup.description || 'No description'}</div>
                  </div>
                </div>

                <div className="contact-info-section">
                  <label>Members ({selectedGroup.members?.length || 0})</label>
                  <div className="contact-info-row">
                    {selectedGroup.members?.slice(0, 5).map((member, index) => (
                      <div key={index} className="contact-info-text" style={{ marginBottom: '8px' }}>
                        • {member.username || member.name}
                      </div>
                    ))}
                    {selectedGroup.members?.length > 5 && (
                      <div className="contact-info-text">• +{selectedGroup.members.length - 5} more</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="contact-photo-section">
                  <div className="contact-photo-large view-only">
                    {selectedUser?.profilePicture ? (
                      <img src={selectedUser.profilePicture} alt="Profile" />
                    ) : (
                      selectedUser?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>

                <div className="contact-photo-name">
                  {selectedUser?.username}
                </div>

                <div className="contact-info-section">
                  <label>About</label>
                  <div className="contact-info-row">
                    <div className="contact-info-text">Available</div>
                  </div>
                </div>

                <div className="contact-info-section">
                  <label>Phone number</label>
                  <div className="contact-info-row">
                    <div className="contact-info-text">{selectedUser?.phoneNumber || selectedUser?.email}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showClearConfirmation}
        title="Clear Chat?"
        message="Clear all messages in this conversation? This action cannot be undone."
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirmation(false)}
        isLoading={isLoadingAction}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Conversation?"
        message="Delete this conversation? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirmation(false)}
        isLoading={isLoadingAction}
      />

      <ConfirmationModal
        isOpen={showLeaveGroupConfirmation}
        title="Leave Group?"
        message="Are you sure you want to leave this group?"
        onConfirm={handleConfirmLeaveGroup}
        onCancel={() => setShowLeaveGroupConfirmation(false)}
        isLoading={isLoadingAction}
      />

      <NotificationModal
        isOpen={showNotification}
        type={notificationData.type}
        title={notificationData.title}
        message={notificationData.message}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
};

export default ChatWindow;

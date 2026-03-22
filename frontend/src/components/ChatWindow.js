import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  MdCall,
  MdVideoCall,
  MdSearch,
  MdSend,
  MdMoreVert,
  MdDeleteOutline,
  MdClose,
  MdHistory,
  MdArrowBack,
  MdStar,
  MdStarBorder,
  MdOpenInNew,
  MdDownload,
  MdCallEnd,
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff
} from 'react-icons/md';
import { BsEmojiSmile, BsPaperclip, BsMic, BsFillPlusCircleFill } from 'react-icons/bs';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { AiOutlineClear } from 'react-icons/ai';
import { FaFileLines, FaImage, FaHeadphones } from 'react-icons/fa6';
import { BiCheckDouble } from 'react-icons/bi';
import { messageAPI, normalizeFileUrl } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import './ChatWindow.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const ChatWindow = ({ selectedUser, messages, onSendMessage, currentUser, isTyping, socket, onClearChat, onDeleteChat, setMessages }) => {
  const [messageText, setMessageText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ type: 'success', title: '', message: '' });
  const [isLoadingAction, setIsLoadingAction] = useState(false);
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

  const resetCallState = () => {
    cleanupPeerConnection();
    stopLocalMedia();
    clearRemoteMedia();
    pendingOfferRef.current = null;
    currentCallUserIdRef.current = null;
    callStartTimeRef.current = null;
    
    // Clear call timeout and timer
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
    
    // Clear ref
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
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
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
        setCallState((prev) => ({
          ...prev,
          isConnected: true,
          status: 'Connected'
        }));
      }

      if (['disconnected', 'failed', 'closed'].includes(state)) {
        setCallState((prev) => ({
          ...prev,
          status: 'Call ended'
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
      console.log('📞 INCOMING CALL RECEIVED:', { fromUserName, callType, callId });
      
      // Only reject if already on a call, not based on selected user
      if (callStatusRef.current.isOpen && callStatusRef.current.isConnected) {
        console.log('❌ Rejecting call - already on a call');
        socket.emit('reject_call', {
          toUserId: fromUserId,
          fromUserId: currentUser._id || currentUser.id,
          callId,
          reason: 'busy'
        });
        return;
      }

      console.log('✅ Accepting incoming call, setting call state...');
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
        callId
      });
      
      // Update ref immediately so setTimeout uses correct state
      callStatusRef.current = {
        isOpen: true,
        isIncoming: true,
        isConnected: false
      };

      // Set timeout for missed call (45 seconds)
      callTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ Call timeout check - current status:', callStatusRef.current);
        if (callStatusRef.current.isOpen && callStatusRef.current.isIncoming && !callStatusRef.current.isConnected) {
          console.log('📵 Call missed - rejecting...');
          socket.emit('reject_call', {
            toUserId: fromUserId,
            fromUserId: currentUser._id || currentUser.id,
            callId,
            reason: 'no_answer'
          });
          resetCallState();
          showCallNotification('info', 'CALL MISSED', `Missed ${callType} call from ${fromUserName}`);
        } else {
          console.log('✅ Call was answered before timeout');
        }
      }, 45000);
    };

    const handleCallAnswered = async ({ fromUserId, answer }) => {
      console.log('📞 Call answered:', { fromUserId });
      if (!peerConnectionRef.current || currentCallUserIdRef.current?.toString() !== fromUserId.toString()) {
        return;
      }

      try {
        // Clear the timeout if exists
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
        
        // Update ref immediately
        callStatusRef.current.isConnected = true;
        callStatusRef.current.isIncoming = false;

        // Start call duration timer
        callTimerRef.current = setInterval(() => {
          setCallState((prev) => ({
            ...prev,
            callDuration: Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          }));
        }, 1000);
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
      showCallNotification('info', 'CALL ENDED', message);
      resetCallState();
    };

    const handleCallEnded = () => {
      showCallNotification('success', 'CALL ENDED', 'The call has ended.');
      resetCallState();
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, currentUser]);

  const startCall = async (callType) => {
    if (!socket || !selectedUser) return;

    const targetUserId = selectedUser._id || selectedUser.id;

    try {
      const stream = await getMediaStream(callType);
      const peerConnection = createPeerConnection(targetUserId);

      attachLocalTracks(peerConnection, stream);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      callStartTimeRef.current = Date.now();
      let callId = null;

      // Wait for call_initiated response with callId
      socket.once('call_initiated', ({ callId: receivedCallId }) => {
        callId = receivedCallId;
        setCallState((prev) => ({
          ...prev,
          callId: receivedCallId
        }));
      });

      setCallState({
        isOpen: true,
        isIncoming: false,
        isConnected: false,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        callType,
        status: callType === 'video' ? 'Calling...' : 'Calling...',
        callerName: selectedUser.username,
        callerAvatar: selectedUser.profilePicture || '',
        callId: null
      });
      
      // Update ref immediately
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

      // Set timeout for no answer (45 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current.isOpen && !callStatusRef.current.isConnected && !callStatusRef.current.isIncoming) {
          socket.emit('end_call', {
            toUserId: targetUserId,
            fromUserId: currentUser._id || currentUser.id,
            callId,
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

      setCallState((prev) => ({
        ...prev,
        isIncoming: false,
        isConnected: true,
        status: 'Connected'
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const renderAttachmentMessage = (msg) => {
    const fileUrl = getFileUrl(msg);
    const displayFileName = getDisplayFileName(msg);

    if (msg.messageType === 'image' || msg.messageType === 'video') {
      return (
        <div className="media-preview">
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
          <div className="media-filename">{displayFileName}</div>
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

    if (msg.messageType === 'audio' || msg.messageType === 'voice') {
      return (
        <div className="audio-preview">
          {msg.messageType !== 'voice' && <div className="audio-filename">{displayFileName}</div>}
          {msg.messageType === 'voice' && <div className="voice-duration" style={{fontSize: '0.8rem', color: '#667781', marginBottom: '4px'}}>Voice message • {msg.fileDuration ? msg.fileDuration + "s" : ""}</div>}
          <audio controls preload="metadata" className="message-audio">
            <source src={fileUrl} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    return (
      <div className="document-preview">
        <FaFileLines size={24} className="document-icon" />
        <div className="document-info">
          <div className="document-filename">{displayFileName}</div>
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
    const isOutgoing = (msg.sender._id || msg.sender).toString() === (currentUser._id || currentUser.id).toString();
    
    return (
      <div className={`call-message ${isMissed ? 'missed' : 'completed'}`}>
        <div className="call-message-icon">
          {msg.callType === 'video' ? <MdVideoCall size={20} /> : <MdCall size={20} />}
        </div>
        <div className="call-message-content">
          <div className="call-message-type">
            {isMissed ? (
              <span className="call-status-missed">Missed {callTypeLabel}</span>
            ) : (
              <span className="call-status-completed">{callTypeLabel}</span>
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
              {selectedUser?.profilePicture ? (
                <img src={selectedUser.profilePicture} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedUser.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="chat-window-user-details" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
              <h3>{selectedUser.username}</h3>
              {isTyping ? (
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
            <button className="icon-button" onClick={() => startCall('video')} title="Video call">
              <MdVideoCall size={26} />
            </button>
            <button className="icon-button" onClick={() => startCall('audio')} title="Audio call">
              <MdCall size={22} />
            </button>
            <div className="divider"></div>
            <button className="icon-button"><MdSearch size={22} /></button>
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <button
                className={`icon-button ${showDropdown ? 'active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MdMoreVert size={22} />
              </button>
              {showDropdown && (
                <div className="chat-window-dropdown">
                  <div className="dropdown-item" onClick={(e) => { toggleFavourite(selectedUser._id || selectedUser.id, e); setShowDropdown(false); }}>
                    {favourites.includes(selectedUser._id || selectedUser.id) ? (
                      <><MdStar className="menu-icon" style={{ color: '#00a884' }} /> Remove favourite</>
                    ) : (
                      <><MdStarBorder className="menu-icon" /> Add to favourites</>
                    )}
                  </div>
                  <div className="dropdown-item" onClick={handleContactInfo}>
                    <IoMdInformationCircleOutline className="menu-icon" /> Contact info
                  </div>
                  <div className="dropdown-item" onClick={handleClearChat}>
                    <AiOutlineClear className="menu-icon" /> Clear chat
                  </div>
                  <div className="dropdown-item delete" onClick={handleDeleteChat}>
                    <MdDeleteOutline className="menu-icon" /> Delete chat
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id || msg.id}
                className={`message ${(msg.sender._id || msg.sender).toString() === (currentUser._id || currentUser.id).toString() ? 'sent' : 'received'}`}
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
                    <p>{msg.content}</p>
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
                        {(msg.sender?._id || msg.sender)?.toString() === (currentUser?._id || currentUser?.id)?.toString() && <BiCheckDouble className="read-receipt" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
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

        {isRecording ? (
          <div className="voice-recording-container">
            <div className="recording-trash" onClick={() => setIsRecording(false)}><MdDeleteOutline size={24} /></div>
            <div className="recording-status">
              <span className="recording-dot"></span>
              <span className="recording-time">0:01</span>
            </div>
            <div className="recording-visualizer">
              <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
              <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
              <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
            </div>
            <div className="recording-pause" onClick={() => setIsRecording(false)}><MdClose size={24} /></div>
            <div className="recording-once"><MdHistory size={20} /></div>
            <button className="send-button voice-send" onClick={() => setIsRecording(false)}><MdSend size={24} /></button>
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
              <button type="button" className="send-button" onClick={() => setIsRecording(true)}>
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
              <span>Profile</span>
            </div>
          </div>
          <div className="contact-info-content">
            <div className="contact-photo-section">
              <div className="contact-photo-large view-only">
                {selectedUser?.profilePicture ? (
                  <img src={selectedUser.profilePicture} alt="Profile" />
                ) : (
                  selectedUser.username.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            <div className="contact-photo-name">
              {selectedUser.username}
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
                <div className="contact-info-text">{selectedUser.phoneNumber || selectedUser.email}</div>
              </div>
            </div>
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

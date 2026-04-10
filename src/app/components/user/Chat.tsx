// Chat.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, User, Send, Paperclip, X, CheckCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAuthContext } from '../../../context/AuthProvider';
import { isChatMessageHidden, supabaseDbService, type ChatMessage } from '../../../services/supabaseDbService';
import { getClient, uploadFileToStorage } from '../../../services/supabaseClient';
import { useToast } from '../../../context/ToastProvider';
import { getActiveFreezeState, type AccountFreezeState } from './userAccountState';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];
const CHAT_PRESENCE_HEARTBEAT_MS = 20000;
const CHAT_BACKGROUND_IMAGE = '/images/chat-background.jpg';
const CHAT_BAR_GRADIENT = 'linear-gradient(135deg, rgba(0, 116, 87, 0.98), rgba(0, 179, 136, 0.95), rgba(2, 86, 63, 0.98))';
const GLASS_GREEN_BUBBLE = {
  background: 'linear-gradient(135deg, rgba(29, 207, 159, 0.56), rgba(29, 207, 159, 0.32))',
  borderColor: 'rgba(255, 255, 255, 0.26)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 18px 40px rgba(0, 64, 48, 0.26)',
} as const;
const GLASS_DARK_BUBBLE = {
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.68))',
  borderColor: 'rgba(255, 255, 255, 0.18)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 18px 40px rgba(3, 7, 18, 0.34)',
} as const;
const CHAT_INPUT_SHADOW = '0 14px 34px rgba(0, 72, 54, 0.2)';
const CHAT_ACTION_SHADOW = '0 12px 28px rgba(0, 72, 54, 0.22)';

function isImageAttachment(fileName: string, attachmentUrl?: string | null) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(attachmentUrl || '');
}

function sortMessages(items: ChatMessage[]) {
  return [...items].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

function getMessageSyncKey(items: ChatMessage[]) {
  return items
    .map((msg) => `${msg.id}:${msg.message}:${msg.attachment_url || ''}:${msg.read ? 1 : 0}:${msg.read_at || ''}:${msg.created_at || ''}`)
    .join('|');
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [accountRestriction, setAccountRestriction] = useState<AccountFreezeState | null>(null);
  const [restrictionResolved, setRestrictionResolved] = useState(false);
  const [hasExistingMessages, setHasExistingMessages] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasRunAnimation = useRef(false);
  const prefillApplied = useRef(false);
  const welcomeMessage = 'Hello! Welcome to Chimehubs customer support. How can we assist you today?';
  const { addToast } = useToast();

  const notifyChatStateChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('user-chat-state-changed'));
  }, []);

  const upsertMessage = useCallback((msg: ChatMessage) => {
    if (isChatMessageHidden(msg)) {
      setMessages((prev) => prev.filter((item) => item.id !== msg.id));
      return;
    }

    setMessages((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === msg.id);
      if (existingIndex === -1) {
        return sortMessages([...prev, msg]);
      }

      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...msg };
      return sortMessages(next);
    });
  }, []);

  const refreshMessages = useCallback(async (activeThreadId: string) => {
    const latest = sortMessages(await supabaseDbService.getChatMessages(activeThreadId));
    setMessages((prev) => (getMessageSyncKey(latest) !== getMessageSyncKey(prev) ? latest : prev));
    setHasExistingMessages(latest.length > 0);
    notifyChatStateChanged();
  }, [notifyChatStateChanged]);

  const resolveThread = useCallback(async (userId: string) => {
    const firstAttempt = await supabaseDbService.getOrCreateChatThread(userId);
    if (firstAttempt?.id) return firstAttempt;

    await new Promise((resolve) => window.setTimeout(resolve, 250));
    return supabaseDbService.getOrCreateChatThread(userId);
  }, []);

  // Determine where to go back to
  const getBackPath = () => {
    const from = (location.state as any)?.from || '/dashboard';
    return from;
  };

  // Typing animation for welcome message - runs only once on initial load if no existing messages
  useEffect(() => {
    if (hasRunAnimation.current || hasExistingMessages) return;

    hasRunAnimation.current = true;
    let index = 0;
    const interval = setInterval(() => {
      if (index < welcomeMessage.length) {
        setDisplayedText(welcomeMessage.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [hasExistingMessages]);

  useEffect(() => {
    const loadChat = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      if (profile?.preferences?.darkMode !== undefined) {
        setDarkMode(!!profile.preferences.darkMode);
      }
      setAccountRestriction(getActiveFreezeState(profile?.preferences));
      setRestrictionResolved(true);
      const thread = await resolveThread(user.id);
      if (!thread?.id) {
        addToast('error', 'Customer support is temporarily unavailable. Please try again.');
        return;
      }
      setThreadId(thread.id);
      const existing = await supabaseDbService.getChatMessages(thread.id);
      setMessages(sortMessages(existing));
      setHasExistingMessages(existing.length > 0);
      await supabaseDbService.markThreadRead(thread.id, user.id);
      notifyChatStateChanged();
    };
    loadChat();
  }, [user?.id, resolveThread, addToast, notifyChatStateChanged]);

  useEffect(() => {
    if (!threadId) return;
    const client = getClient();
    if (!client) return;
    const channel = client
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          upsertMessage(msg);
          setHasExistingMessages(true);
          if (msg.sender_type === 'admin' && user?.id) {
            await supabaseDbService.markThreadRead(threadId, user.id);
            notifyChatStateChanged();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (isChatMessageHidden(msg)) {
            void refreshMessages(threadId);
            return;
          }
          upsertMessage(msg);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        () => {
          void refreshMessages(threadId);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [notifyChatStateChanged, refreshMessages, threadId, upsertMessage, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let heartbeatId: number | null = null;
    const touchPresence = () => {
      void supabaseDbService.touchChatLastSeen(user.id);
    };
    const startHeartbeat = () => {
      touchPresence();
      if (heartbeatId !== null) return;
      heartbeatId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          touchPresence();
        }
      }, CHAT_PRESENCE_HEARTBEAT_MS);
    };
    const stopHeartbeat = () => {
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
        heartbeatId = null;
      }
      touchPresence();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        touchPresence();
      }
    };

    if (document.visibilityState === 'visible') {
      startHeartbeat();
    } else {
      touchPresence();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
      }
      touchPresence();
    };
  }, [user?.id]);

  useEffect(() => {
    if (prefillApplied.current || !restrictionResolved) return;
    const prefill = (location.state as any)?.prefillMessage;
    if (typeof prefill === 'string' && prefill.trim()) {
      if (accountRestriction?.isFrozen) {
        setInput(prefill.trim());
      }
      prefillApplied.current = true;
    }
  }, [accountRestriction?.isFrozen, location.state, restrictionResolved]);

  useEffect(() => {
    if (!threadId) return;
    let isMounted = true;
    const poll = async () => {
      const latest = sortMessages(await supabaseDbService.getChatMessages(threadId));
      if (!isMounted) return;
      setMessages((prev) => (getMessageSyncKey(latest) !== getMessageSyncKey(prev) ? latest : prev));
      setHasExistingMessages(latest.length > 0);
      notifyChatStateChanged();
    };
    const interval = setInterval(poll, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [notifyChatStateChanged, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '40px';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 40), 150);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 150 ? 'auto' : 'hidden';
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || input.length > 1000 || !user?.id || isSending) return;
    setIsSending(true);
    try {
      const thread = threadId ? { id: threadId } : await resolveThread(user.id);
      if (!thread?.id) {
        addToast('error', 'Unable to open customer support right now.');
        return;
      }
      if (!threadId) setThreadId(thread.id);

      const saved = await supabaseDbService.sendChatMessage({
        thread_id: thread.id,
        user_id: user.id,
        sender_type: 'user',
        message: input.trim(),
        attachment_url: null,
        read: false,
      });

      if (!saved) {
        addToast('error', 'Message failed to send. Please try again.');
        return;
      }

      upsertMessage(saved);
      setHasExistingMessages(true);
      await supabaseDbService.markThreadRead(thread.id, user.id);
      void supabaseDbService.sendUserChatSupportAlert(saved.id);
      notifyChatStateChanged();
      setInput('');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || isUploading) return;
    const files = e.target.files;
    if (files && files[0]) {
      setIsUploading(true);
      const file = files[0];
      try {
        const thread = threadId ? { id: threadId } : await resolveThread(user.id);
        if (!thread?.id) {
          addToast('error', 'Unable to open customer support right now.');
          return;
        }
        if (!threadId) setThreadId(thread.id);

        const path = `${user.id}/${Date.now()}-${file.name}`;
        const url = await uploadFileToStorage('chat-attachments', path, file);
        if (!url) {
          addToast('error', 'Upload failed. Please try again.');
          return;
        }

        const saved = await supabaseDbService.sendChatMessage({
          thread_id: thread.id,
          user_id: user.id,
          sender_type: 'user',
          message: file.name,
          attachment_url: url,
          read: false,
        });
        if (!saved) {
          addToast('error', 'Attachment failed to send. Please try again.');
          return;
        }

        upsertMessage(saved);
        setHasExistingMessages(true);
        await supabaseDbService.markThreadRead(thread.id, user.id);
        void supabaseDbService.sendUserChatSupportAlert(saved.id);
        notifyChatStateChanged();
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
      }
    }
  };

  const canSend = Boolean(input.trim()) && input.length <= 1000 && !!user?.id && !isSending;

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-white'
    } relative overflow-hidden`}>
      <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
            backgroundImage: `url('${CHAT_BACKGROUND_IMAGE}')`,
            filter: darkMode ? 'brightness(0.3) saturate(0.95)' : 'brightness(0.72) saturate(0.92)',
          }}
        />
        <div className={`absolute inset-0 ${darkMode ? 'bg-[linear-gradient(180deg,rgba(3,18,12,0.88),rgba(6,20,15,0.8),rgba(2,14,10,0.9))]' : 'bg-[linear-gradient(180deg,rgba(236,253,245,0.74),rgba(255,255,255,0.6),rgba(241,255,248,0.7))]'}`} />
      </div>
      {/* Chat Header */}
      <motion.div
        className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/18 px-4 py-4 text-white"
        style={{
          background: CHAT_BAR_GRADIENT,
          boxShadow: '0 12px 28px rgba(0, 72, 54, 0.2)',
        }}
      >
        <motion.button 
          onClick={() => navigate(getBackPath())}
          whileHover={{ scale: 1.1, rotate: -10 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/18 bg-white/12 text-white transition-colors shadow-md hover:bg-white/18 hover:shadow-lg"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 bg-white/14"
        >
          <User className="w-5 h-5 text-white" />
        </motion.div>
        <div>
          <div className="text-base font-semibold">Customer Care</div>
          <div className="mt-1 text-xs text-white/80">Secure support channel</div>
        </div>
      </motion.div>
      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto px-6 py-6">
        {accountRestriction && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            darkMode
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {accountRestriction.reason === 'withdrawal_security_pin'
              ? 'Your account is frozen pending withdrawal PIN verification. Customer support remains available so you can request the required 6-digit PIN.'
              : accountRestriction.reason === 'account_liquidation'
                ? 'Your account has been liquidated by your account manager with your prior consent. Customer support remains available if you need final statements or assistance.'
                : 'Your account is under an admin control restriction. Customer support remains available if you need help.'}
          </div>
        )}
        {/* Welcome Message with Typing Animation - Only show if no existing messages */}
        {!hasExistingMessages && (
          <div className="flex justify-start mb-4">
            <Card
              className="max-w-[80%] rounded-xl border p-4 text-white"
              style={GLASS_DARK_BUBBLE}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-white/12 flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-semibold text-white">Customer Care</span>
              </div>
              <div className="text-sm text-white">{displayedText}<span className={displayedText === welcomeMessage ? 'hidden' : 'inline-block w-1 h-4 ml-1 bg-[#8ff7cf] animate-pulse'}></span></div>
              <div className="mt-2 text-xs text-white/72">Just now</div>
            </Card>
          </div>
        )}
        {/* Messages */}
        {messages.map((msg) => {
          const fileName = msg.message || '';
          const ext = (fileName.split('.').pop() || '').toLowerCase();
          const isImage = isImageAttachment(fileName, msg.attachment_url);
          const isVideo = VIDEO_EXTENSIONS.includes(ext);
          const isAudio = AUDIO_EXTENSIONS.includes(ext);
          const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          return msg.sender_type === 'user' ? (
            <div key={msg.id} className="flex justify-end mb-4">
              <Card className="max-w-[80%] rounded-xl border p-4 text-white" style={GLASS_GREEN_BUBBLE}>
                {msg.attachment_url ? (
                  <div className="space-y-2">
                    {isImage && (
                      <button
                        type="button"
                        onClick={() => setImagePreview({ url: msg.attachment_url || '', name: msg.message })}
                        className="block w-full"
                        title="Open image"
                      >
                        <img src={msg.attachment_url} alt={msg.message} className="w-full rounded-lg max-h-[420px] object-contain" />
                      </button>
                    )}
                    {isVideo && (
                      <video controls className="max-w-full rounded-lg max-h-96">
                        <source src={msg.attachment_url} />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {isAudio && (
                      <audio controls className="w-full">
                        <source src={msg.attachment_url} />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    {!isImage && !isVideo && !isAudio && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline text-white/82">{msg.message}</a>
                    )}
                  </div>
                ) : (
                  <div className="text-sm break-words">{msg.message}</div>
                )}
                <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                  <span className="text-white/70">{timestamp}</span>
                  <CheckCheck className={`w-4 h-4 ${msg.read ? 'text-[#8ad8ff]' : 'text-white/70'}`} />
                </div>
              </Card>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start mb-4">
              <Card className="max-w-[80%] rounded-xl border p-4 text-white" style={GLASS_DARK_BUBBLE}>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-white/12 flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white">Customer Care</span>
                </div>
                {msg.attachment_url ? (
                  <div className="space-y-2">
                    {isImage && (
                      <button
                        type="button"
                        onClick={() => setImagePreview({ url: msg.attachment_url || '', name: msg.message })}
                        className="block w-full"
                        title="Open image"
                      >
                        <img src={msg.attachment_url} alt={msg.message} className="w-full rounded-lg max-h-[420px] object-contain" />
                      </button>
                    )}
                    {isVideo && (
                      <video controls className="max-w-full rounded-lg max-h-96">
                        <source src={msg.attachment_url} />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {isAudio && (
                      <audio controls className="w-full">
                        <source src={msg.attachment_url} />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    {!isImage && !isVideo && !isAudio && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-sm underline text-white">
                        {msg.message}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-sm break-words text-white">{msg.message}</div>
                )}
                <div className="mt-2 text-xs text-white/72">{timestamp}</div>
              </Card>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div
        className="sticky bottom-0 border-t border-white/18 px-4 py-4 shadow-lg"
        style={{
          background: CHAT_BAR_GRADIENT,
          boxShadow: '0 -12px 28px rgba(0, 72, 54, 0.22)',
        }}
      >
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            aria-label="Upload file"
            title="Upload file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!user?.id || isUploading}
            className="w-10 h-10 rounded-xl border border-white/18 bg-white/12 flex items-center justify-center text-white/85 transition-colors hover:bg-white/18 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: CHAT_ACTION_SHADOW }}
            title="Upload file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {input.trim().length > 0 && (
              <div className="mb-1 text-xs text-white/82">
                User is typing...
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              rows={1}
              maxLength={1000}
              disabled={!user?.id || isSending}
              className="w-full min-h-[40px] max-h-[150px] rounded-xl px-3 py-2 text-sm outline-none border resize-none transition-shadow border-white/18 bg-white/94 text-slate-900 placeholder:text-slate-400 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60"
              style={{ resize: 'none', boxShadow: CHAT_INPUT_SHADOW }}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!canSend}
            className={`w-12 h-12 rounded-xl border transition-all duration-200 ${
              canSend
                ? 'bg-gradient-to-r from-[#00A36C] to-[#008080] border-transparent text-white shadow-md hover:brightness-110'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-white/40 opacity-70'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70'
            }`}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="mt-2 text-center text-xs text-white/82">Typical response time: 2-5 minutes</div>
      </div>
      {imagePreview && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Close image"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={imagePreview.url}
            alt={imagePreview.name || 'Attachment preview'}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[96vw] max-h-[88vh] w-auto h-auto rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}





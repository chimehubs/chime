import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Send, Paperclip, Search, X, CheckCheck, Pencil, Trash2, Check, Reply } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { isChatMessageDeleted, supabaseDbService, type ChatMessage, type ChatThread, type Profile } from '../../../services/supabaseDbService';
import { getClient, uploadFileToStorage } from '../../../services/supabaseClient';

interface AdminChatProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

type ThreadRow = {
  thread: ChatThread;
  profile?: Profile | null;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];
const USER_ONLINE_WINDOW_MS = 45000;
const CHAT_BACKGROUND_IMAGE = '/images/chat-background.jpg';
const CHAT_BAR_GRADIENT = 'linear-gradient(135deg, rgba(0, 116, 87, 0.98), rgba(0, 179, 136, 0.95), rgba(2, 86, 63, 0.98))';
const GLASS_GREEN_BUBBLE = {
  background: 'linear-gradient(135deg, rgba(29, 207, 159, 0.54), rgba(29, 207, 159, 0.3))',
  borderColor: 'rgba(255, 255, 255, 0.26)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 18px 40px rgba(0, 64, 48, 0.26)',
} as const;
const GLASS_DARK_BUBBLE = {
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.68))',
  borderColor: 'rgba(255, 255, 255, 0.18)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 18px 40px rgba(3, 7, 18, 0.34)',
} as const;
const CHAT_INPUT_SHADOW = '0 14px 34px rgba(0, 72, 54, 0.2)';
const CHAT_ACTION_SHADOW = '0 12px 28px rgba(0, 72, 54, 0.22)';
const CHAT_REPLY_PANEL = 'linear-gradient(135deg, rgba(4, 47, 46, 0.96), rgba(9, 121, 105, 0.82), rgba(16, 185, 129, 0.7))';

const CHAT_HEADER_SAFE_AREA_STYLE = {
  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
  paddingBottom: '1rem',
} as const;

const CHAT_INPUT_SAFE_AREA_STYLE = {
  paddingTop: '1rem',
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
} as const;

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

function sortThreadRows(items: ThreadRow[]) {
  return [...items].sort((a, b) => {
    const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
    const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

function hasMessageBeenEdited(message: ChatMessage) {
  if (!message.updated_at || !message.created_at) return false;
  return new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 1000;
}

function getThreadPreview(message?: ChatMessage | null) {
  if (!message) return 'No messages';
  if (isChatMessageDeleted(message)) {
    return message.sender_type === 'admin' ? 'Customer Care deleted a message' : 'Customer deleted a message';
  }
  return message.message || 'No messages';
}

function getReplySnippet(message?: ChatMessage | null) {
  if (!message) return 'Original message is no longer available';
  if (isChatMessageDeleted(message)) return 'Message deleted';
  if (message.attachment_url) return message.message || 'Attachment';
  return message.message || 'Message';
}

function isUserOnline(profile?: Profile | null, now = Date.now()) {
  if (!profile?.chat_last_seen_at) return false;
  return now - new Date(profile.chat_last_seen_at).getTime() <= USER_ONLINE_WINDOW_MS;
}

function formatPresence(profile?: Profile | null, now = Date.now()) {
  if (!profile?.chat_last_seen_at) return 'No recent activity';

  if (isUserOnline(profile, now)) {
    return 'Online now';
  }

  const lastSeen = new Date(profile.chat_last_seen_at);
  const diffMs = now - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Last seen just now';
  if (diffMinutes < 60) return `Last seen ${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Last seen ${diffHours} hr ago`;

  return `Last seen ${lastSeen.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function AdminChat({ isOpen, onClose, onUnreadCountChange }: AdminChatProps) {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [imagePreview, setImagePreview] = useState<{ url: string; name?: string } | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadsRef = useRef<ThreadRow[]>([]);

  const selectedThread = threads.find((row) => row.thread.id === selectedThreadId) || null;
  const unreadCount = threads.reduce((sum, row) => sum + row.unreadCount, 0);

  const getReplyTarget = useCallback(
    (targetId?: string | null) => messages.find((message) => message.id === targetId) || null,
    [messages]
  );

  const upsertMessage = useCallback((msg: ChatMessage) => {
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

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((item) => item.id !== messageId));
  }, []);

  const resetEditingState = useCallback(() => {
    setEditingMessageId(null);
    setEditDraft('');
  }, []);

  const applyThreadReadState = useCallback((threadId: string, readAt = new Date().toISOString()) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.thread_id === threadId && message.sender_type === 'user' && !message.read
          ? { ...message, read: true, read_at: readAt }
          : message
      )
    );

    setThreads((prev) =>
      sortThreadRows(
        prev.map((row) =>
          row.thread.id === threadId
            ? {
                ...row,
                unreadCount: 0,
                lastMessage:
                  row.lastMessage?.sender_type === 'user' && !row.lastMessage.read
                    ? { ...row.lastMessage, read: true, read_at: readAt }
                    : row.lastMessage,
              }
            : row
        )
      )
    );
  }, []);

  const markThreadAsRead = useCallback(async (threadId: string) => {
    const readAt = new Date().toISOString();
    applyThreadReadState(threadId, readAt);
    await supabaseDbService.markThreadReadByAdmin(threadId);
  }, [applyThreadReadState]);

  const loadThreads = useCallback(async (nextSelectedThreadId = selectedThreadId) => {
    const [threadsData, profiles] = await Promise.all([
      supabaseDbService.getAllChatThreads(),
      supabaseDbService.getAllProfiles(),
    ]);

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const threadIds = threadsData.map((thread) => thread.id);
    const allMessages = sortMessages(await supabaseDbService.getChatMessagesForThreads(threadIds));
    const messagesByThread = new Map<string, ChatMessage[]>();

    allMessages.forEach((msg) => {
      const list = messagesByThread.get(msg.thread_id) || [];
      list.push(msg);
      messagesByThread.set(msg.thread_id, list);
    });

    const rows = sortThreadRows(
      threadsData.map((thread) => {
        const threadMessages = messagesByThread.get(thread.id) || [];
        const lastMessage = threadMessages.length ? threadMessages[threadMessages.length - 1] : null;
        return {
          thread,
          profile: profileById.get(thread.user_id) || null,
          lastMessage,
          unreadCount: threadMessages.filter((msg) => msg.sender_type === 'user' && !msg.read).length,
        } as ThreadRow;
      })
    );

    setThreads(rows);

    if (nextSelectedThreadId) {
      const selectedExists = rows.some((row) => row.thread.id === nextSelectedThreadId);
      if (!selectedExists) {
        setSelectedThreadId(null);
        setMessages([]);
        resetEditingState();
        return;
      }
      setMessages(sortMessages(messagesByThread.get(nextSelectedThreadId) || []));
    }
  }, [resetEditingState, selectedThreadId]);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  useEffect(() => {
    if (!isOpen || view !== 'chat' || !selectedThreadId) return;
    void markThreadAsRead(selectedThreadId);
  }, [isOpen, markThreadAsRead, selectedThreadId, view]);

  useEffect(() => {
    if (!isOpen) return;
    setPresenceNow(Date.now());
    const interval = window.setInterval(() => {
      setPresenceNow(Date.now());
    }, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void loadThreads();
  }, [isOpen, loadThreads]);

  useEffect(() => {
    if (view !== 'chat') {
      resetEditingState();
    }
  }, [resetEditingState, view, selectedThreadId]);

  useEffect(() => {
    if (!isOpen) return;
    const client = getClient();
    if (!client) return;

    const channel = client
      .channel('admin-chat:overview')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_threads' },
        (payload) => {
          const thread = payload.new as ChatThread;
          if (threadsRef.current.some((row) => row.thread.id === thread.id)) {
            return;
          }

          void (async () => {
            const profile = await supabaseDbService.getProfile(thread.user_id);
            setThreads((prev) =>
              prev.some((row) => row.thread.id === thread.id)
                ? prev
                : sortThreadRows([
                    ...prev,
                    {
                      thread,
                      profile,
                      lastMessage: null,
                      unreadCount: 0,
                    },
                  ])
            );
          })();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const profile = payload.new as Profile;
          setThreads((prev) =>
            prev.some((row) => row.thread.user_id === profile.id)
              ? prev.map((row) =>
                  row.thread.user_id === profile.id
                    ? { ...row, profile: { ...(row.profile || {}), ...profile } }
                    : row
                )
              : prev
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          const isSelectedChatOpen = view === 'chat' && selectedThreadId === msg.thread_id;

          if (selectedThreadId === msg.thread_id) {
            upsertMessage(msg);
          }

          setThreads((prev) => {
            const found = prev.some((row) => row.thread.id === msg.thread_id);
            if (!found) return prev;

            return sortThreadRows(
              prev.map((row) =>
                row.thread.id === msg.thread_id
                  ? {
                      ...row,
                      lastMessage: msg,
                      unreadCount:
                        msg.sender_type === 'user'
                          ? isSelectedChatOpen
                            ? 0
                            : row.unreadCount + 1
                          : row.unreadCount,
                    }
                  : row
              )
            );
          });

          if (msg.sender_type === 'user' && isSelectedChatOpen) {
            void markThreadAsRead(msg.thread_id);
          }

          if (!threadsRef.current.some((row) => row.thread.id === msg.thread_id)) {
            void (async () => {
              const [thread, profile] = await Promise.all([
                supabaseDbService.getChatThread(msg.thread_id),
                supabaseDbService.getProfile(msg.user_id),
              ]);

              if (!thread) return;

              setThreads((prev) =>
                prev.some((row) => row.thread.id === thread.id)
                  ? prev
                  : sortThreadRows([
                      ...prev,
                      {
                        thread,
                        profile,
                        lastMessage: msg,
                        unreadCount: msg.sender_type === 'user' && !isSelectedChatOpen ? 1 : 0,
                      },
                    ])
              );
            })();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;

          if (selectedThreadId === msg.thread_id) {
            upsertMessage(msg);
          }

          setThreads((prev) =>
            sortThreadRows(
              prev.map((row) => {
                if (row.thread.id !== msg.thread_id) {
                  return row;
                }

                const lastMessageTime = row.lastMessage?.created_at ? new Date(row.lastMessage.created_at).getTime() : 0;
                const updatedMessageTime = msg.created_at ? new Date(msg.created_at).getTime() : 0;
                const shouldUpdateLastMessage =
                  !row.lastMessage || row.lastMessage.id === msg.id || updatedMessageTime >= lastMessageTime;

                return {
                  ...row,
                  lastMessage: shouldUpdateLastMessage
                    ? row.lastMessage?.id === msg.id
                      ? { ...row.lastMessage, ...msg }
                      : msg
                    : row.lastMessage,
                  unreadCount:
                    msg.sender_type === 'user' && msg.read
                      ? Math.max(0, row.unreadCount - 1)
                      : row.unreadCount,
                };
              })
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        () => {
          void loadThreads();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isOpen, loadThreads, markThreadAsRead, removeMessage, selectedThreadId, upsertMessage, view]);

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

  const resetComposer = () => {
    setInput('');
    setReplyToMessageId(null);
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '40px';
    textarea.style.overflowY = 'hidden';
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyToMessageId(messageId);
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleStartEditingMessage = useCallback((message: ChatMessage) => {
    if (message.sender_type !== 'admin' || message.attachment_url) return;
    setEditingMessageId(message.id);
    setEditDraft(message.message || '');
  }, []);

  const handleSaveEditedMessage = useCallback(async () => {
    if (!editingMessageId) return;

    const nextMessage = editDraft.trim();
    if (!nextMessage) return;

    const currentMessage = messages.find((message) => message.id === editingMessageId);
    if (!currentMessage) {
      resetEditingState();
      return;
    }

    if (currentMessage.message === nextMessage) {
      resetEditingState();
      return;
    }

    setBusyMessageId(editingMessageId);
    try {
      const updated = await supabaseDbService.updateChatMessage(editingMessageId, {
        message: nextMessage,
      });
      if (!updated) return;

      upsertMessage(updated);
      setThreads((prev) =>
        sortThreadRows(
          prev.map((row) =>
            row.thread.id === updated.thread_id && row.lastMessage?.id === updated.id
              ? { ...row, lastMessage: { ...row.lastMessage, ...updated } }
              : row
          )
        )
      );
      resetEditingState();
    } finally {
      setBusyMessageId(null);
    }
  }, [editDraft, editingMessageId, messages, resetEditingState, upsertMessage]);

  const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
    if (!window.confirm('Delete this message from the conversation?')) {
      return;
    }

    setBusyMessageId(message.id);
    try {
      const deleted = await supabaseDbService.deleteChatMessage(message.id);
      if (!deleted) return;

      upsertMessage(deleted);
      setThreads((prev) =>
        sortThreadRows(
          prev.map((row) =>
            row.thread.id === deleted.thread_id && row.lastMessage?.id === deleted.id
              ? { ...row, lastMessage: deleted }
              : row
          )
        )
      );
      if (editingMessageId === message.id) {
        resetEditingState();
      }
      void loadThreads(selectedThreadId || undefined);
    } finally {
      setBusyMessageId(null);
    }
  }, [editingMessageId, loadThreads, resetEditingState, selectedThreadId, upsertMessage]);

  const handleSelectThread = async (row: ThreadRow) => {
    setSelectedThreadId(row.thread.id);
    setView('chat');

    const threadMessages = sortMessages(await supabaseDbService.getChatMessages(row.thread.id));
    const readAt = new Date().toISOString();
    const nextMessages = threadMessages.map((message) =>
      message.sender_type === 'user' && !message.read ? { ...message, read: true, read_at: readAt } : message
    );

    setMessages(nextMessages);
    resetComposer();
    applyThreadReadState(row.thread.id, readAt);

    await supabaseDbService.markThreadReadByAdmin(row.thread.id);
    await loadThreads(row.thread.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedThread || isSending) return;

    setIsSending(true);
    try {
      const saved = await supabaseDbService.sendChatMessage({
        thread_id: selectedThread.thread.id,
        user_id: selectedThread.thread.user_id,
        sender_type: 'admin',
        message: input.trim(),
        attachment_url: null,
        reply_to_message_id: replyToMessageId,
        read: false,
      });
      if (!saved) return;

      upsertMessage(saved);
      setThreads((prev) =>
        sortThreadRows(
          prev.map((row) =>
            row.thread.id === saved.thread_id
              ? {
                  ...row,
                  lastMessage: saved,
                }
              : row
          )
        )
      );
      resetComposer();
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedThread || isUploading) return;

    const files = e.target.files;
    if (files && files[0]) {
      setIsUploading(true);
      const file = files[0];
      const path = `${selectedThread.thread.user_id}/${Date.now()}-${file.name}`;

      try {
        const url = await uploadFileToStorage('chat-attachments', path, file);
        if (url) {
          const saved = await supabaseDbService.sendChatMessage({
            thread_id: selectedThread.thread.id,
            user_id: selectedThread.thread.user_id,
            sender_type: 'admin',
            message: file.name,
            attachment_url: url,
            reply_to_message_id: replyToMessageId,
            read: false,
          });
          if (saved) {
            upsertMessage(saved);
            setThreads((prev) =>
              sortThreadRows(
                prev.map((row) =>
                  row.thread.id === saved.thread_id
                    ? {
                        ...row,
                        lastMessage: saved,
                      }
                    : row
                )
              )
            );
            resetComposer();
          }
        }
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
      }
    }
  };

  const filteredThreads = threads.filter((row) => {
    const name = row.profile?.name || `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim();
    const email = row.profile?.email || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  const selectedProfileName =
    selectedThread?.profile?.name ||
    `${selectedThread?.profile?.first_name || ''} ${selectedThread?.profile?.last_name || ''}`.trim() ||
    selectedThread?.profile?.email ||
    'Customer';
  const selectedPresence = formatPresence(selectedThread?.profile, presenceNow);
  const selectedUserIsOnline = isUserOnline(selectedThread?.profile, presenceNow);
  const canSend = Boolean(input.trim()) && !!selectedThread && !isSending;
  const activeReplyTarget = getReplyTarget(replyToMessageId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-end sm:justify-center"
    >
    <motion.div
      initial={{ y: '100%', x: 0 }}
      animate={{ y: 0, x: 0 }}
      exit={{ y: '100%', x: 0 }}
      className="relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh] sm:max-h-[90vh] sm:w-[500px] sm:rounded-3xl"
    >
      <motion.div
        className="sticky top-0 z-10 flex items-center justify-between border-b border-white/18 px-4 text-white sm:rounded-t-3xl"
        style={{
          background: CHAT_BAR_GRADIENT,
          boxShadow: '0 12px 28px rgba(0, 72, 54, 0.2)',
          ...CHAT_HEADER_SAFE_AREA_STYLE,
        }}
      >
          <div className="flex items-center gap-3">
            {view === 'chat' && (
              <motion.button
                onClick={() => setView('list')}
                whileHover={{ scale: 1.1, rotate: -10 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/12 text-white transition-colors shadow-sm hover:bg-white/18 hover:shadow-md"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <div>
              <div className="text-base font-semibold">{view === 'list' ? 'Customer Support' : selectedProfileName}</div>
              {view === 'chat' && (
                <div className="flex items-center gap-2 mt-1">
                  <motion.span
                    animate={selectedUserIsOnline ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={selectedUserIsOnline ? { duration: 1.5, repeat: Infinity } : undefined}
                    className={`w-2 h-2 rounded-full ${selectedUserIsOnline ? 'bg-green-500' : 'bg-slate-300'}`}
                  />
                  <span className="text-xs text-white/82">{selectedPresence}</span>
                </div>
              )}
            </div>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/12 text-white/80 transition-colors hover:bg-white/18 hover:text-white"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {view === 'list' ? (
          <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10 h-10 bg-[#f9fafb] border-0 rounded-lg"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <User className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                filteredThreads.map((row) => {
                  const userName =
                    row.profile?.name ||
                    `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim() ||
                    'Customer';
                  const userEmail = row.profile?.email || '';
                  const lastMessageTime = row.lastMessage?.created_at
                    ? new Date(row.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                    : '';
                  const userPresence = formatPresence(row.profile, presenceNow);
                  const userOnline = isUserOnline(row.profile, presenceNow);

                  return (
                    <motion.button
                      key={row.thread.id}
                      onClick={() => handleSelectThread(row)}
                      whileHover={{ backgroundColor: '#f3f4f6' }}
                      className="w-full text-left px-4 py-4 border-b border-border transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#00b388] flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <p className="font-semibold text-sm">{userName}</p>
                            {lastMessageTime && <span className="text-xs text-muted-foreground">{lastMessageTime}</span>}
                          </div>
                          {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`w-2 h-2 rounded-full ${userOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <span>{userPresence}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {getThreadPreview(row.lastMessage)}
                          </p>
                        </div>
                        {row.unreadCount > 0 && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="flex-shrink-0 min-w-fit"
                          >
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-[#00b388] rounded-full">
                              {row.unreadCount}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-white">
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${CHAT_BACKGROUND_IMAGE}')`,
                  }}
                />
                <div className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.75)' }} />
              </div>

              <div className="relative z-10 h-full overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-200">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm">Start a conversation with {selectedProfileName}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const fileName = msg.message || '';
                  const ext = (fileName.split('.').pop() || '').toLowerCase();
                  const isImage = isImageAttachment(fileName, msg.attachment_url);
                  const isVideo = VIDEO_EXTENSIONS.includes(ext);
                  const isAudio = AUDIO_EXTENSIONS.includes(ext);
                  const timestamp = msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const isDeletedMessage = isChatMessageDeleted(msg);
                  const wasEdited = hasMessageBeenEdited(msg);
                  const replyTarget = getReplyTarget(msg.reply_to_message_id);
                  const replyAuthor = replyTarget
                    ? replyTarget.sender_type === 'user'
                      ? 'Customer'
                      : 'You'
                    : 'Original';
                  const isEditingThisMessage = editingMessageId === msg.id;
                  const isBusyMessage = busyMessageId === msg.id;

                  return msg.sender_type === 'user' ? (
                    <div key={msg.id} className="flex justify-start">
                      <div className="relative flex max-w-[88%] items-center gap-2">
                        <div className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white/72 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                          <Reply className="h-4 w-4" />
                        </div>
                        <motion.div
                          drag="x"
                          dragSnapToOrigin
                          dragConstraints={{ left: 0, right: 88 }}
                          dragElastic={0.08}
                          whileDrag={{ scale: 1.01 }}
                          onDragEnd={(_, info) => {
                            if (info.offset.x > 56) {
                              handleReplyToMessage(msg.id);
                            }
                          }}
                          className="min-w-0"
                        >
                      <Card
                        className="max-w-full rounded-2xl border p-4 shadow-lg"
                        style={GLASS_GREEN_BUBBLE}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-white">Customer</span>
                        </div>
                        {replyTarget && (
                          <button
                            type="button"
                            onClick={() => handleReplyToMessage(replyTarget.id)}
                            className="mb-3 block w-full rounded-2xl border border-white/18 bg-black/16 px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 h-10 w-1 rounded-full bg-emerald-100/90" />
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50/92">{replyAuthor}</div>
                                <div className="mt-1 line-clamp-2 text-xs text-white/82">{getReplySnippet(replyTarget)}</div>
                              </div>
                            </div>
                          </button>
                        )}
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
                              </video>
                            )}
                            {isAudio && (
                              <audio controls className="w-full">
                                <source src={msg.attachment_url} />
                              </audio>
                            )}
                            {!isImage && !isVideo && !isAudio && (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline text-white/90">
                                {msg.message}
                              </a>
                            )}
                          </div>
                        ) : isDeletedMessage ? (
                          <div className="text-sm italic text-white/78">Customer deleted this message</div>
                        ) : (
                          <div className="text-sm break-words whitespace-pre-wrap text-white">{msg.message}</div>
                        )}
                        <div className="mt-2 text-xs text-white/70">{timestamp}</div>
                      </Card>
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-end">
                      <div className="relative flex max-w-[88%] items-center gap-2">
                        <div className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white/72 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                          <Reply className="h-4 w-4" />
                        </div>
                        <motion.div
                          drag="x"
                          dragSnapToOrigin
                          dragConstraints={{ left: 0, right: 88 }}
                          dragElastic={0.08}
                          whileDrag={{ scale: 1.01 }}
                          onDragEnd={(_, info) => {
                            if (info.offset.x > 56) {
                              handleReplyToMessage(msg.id);
                            }
                          }}
                          className="min-w-0"
                        >
                      <Card
                        className="max-w-full rounded-2xl border p-4 text-white shadow-lg"
                        style={GLASS_DARK_BUBBLE}
                      >
                        <div className="mb-3 flex items-center justify-end gap-1">
                          {!msg.attachment_url && !isEditingThisMessage && !isDeletedMessage && (
                            <button
                              type="button"
                              onClick={() => handleStartEditingMessage(msg)}
                              disabled={!!busyMessageId}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isEditingThisMessage && !isDeletedMessage && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteMessage(msg)}
                              disabled={!!busyMessageId}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-white/80 transition-colors hover:bg-red-500/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {replyTarget && (
                          <button
                            type="button"
                            onClick={() => handleReplyToMessage(replyTarget.id)}
                            className="mb-3 block w-full rounded-2xl border border-white/14 bg-white/8 px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 h-10 w-1 rounded-full bg-[#39dba6]" />
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ff7d4]">{replyAuthor}</div>
                                <div className="mt-1 line-clamp-2 text-xs text-white/78">{getReplySnippet(replyTarget)}</div>
                              </div>
                            </div>
                          </button>
                        )}
                        {isEditingThisMessage ? (
                          <div className="space-y-3">
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              rows={3}
                              maxLength={1000}
                              className="w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-sm text-white outline-none placeholder:text-white/55 resize-none"
                              placeholder="Edit message..."
                            />
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[11px] text-white/70">{editDraft.trim().length}/1000</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={resetEditingState}
                                  disabled={isBusyMessage}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Cancel edit"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveEditedMessage()}
                                  disabled={isBusyMessage || !editDraft.trim()}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#00b388] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Save edit"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : msg.attachment_url ? (
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
                              </video>
                            )}
                            {isAudio && (
                              <audio controls className="w-full">
                                <source src={msg.attachment_url} />
                              </audio>
                            )}
                            {!isImage && !isVideo && !isAudio && (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline text-white/80">
                                {msg.message}
                              </a>
                            )}
                          </div>
                        ) : isDeletedMessage ? (
                          <div className="text-sm italic text-white/78">You deleted this message</div>
                        ) : (
                          <div className="text-sm break-words whitespace-pre-wrap">{msg.message}</div>
                        )}
                        <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                          {wasEdited && !isDeletedMessage && <span className="text-white/55">edited</span>}
                          <span className="text-white/70">{timestamp}</span>
                          <CheckCheck className={`w-4 h-4 ${msg.read ? 'text-[#8ad8ff]' : 'text-white/70'}`} />
                        </div>
                      </Card>
                        </motion.div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
              </div>
            </div>

            <div
              className="sticky bottom-0 border-t border-white/18 px-4 shadow-lg sm:rounded-b-3xl"
              style={{
                background: CHAT_BAR_GRADIENT,
                boxShadow: '0 -12px 28px rgba(0, 72, 54, 0.22)',
                ...CHAT_INPUT_SAFE_AREA_STYLE,
              }}
            >
              {activeReplyTarget && (
                <div
                  className="mb-3 rounded-[22px] border border-white/18 px-3 py-3 text-white shadow-[0_14px_30px_rgba(3,7,18,0.18)]"
                  style={{ background: CHAT_REPLY_PANEL }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50/92">
                        <Reply className="h-3.5 w-3.5" />
                        <span>
                          Replying to {activeReplyTarget.sender_type === 'user' ? 'Customer' : 'your message'}
                        </span>
                      </div>
                      <div className="mt-2 rounded-2xl border border-white/14 bg-black/16 px-3 py-2 text-sm text-white/86">
                        {getReplySnippet(activeReplyTarget)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyToMessageId(null)}
                      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/10 text-white/80 transition-colors hover:bg-white/16 hover:text-white"
                      title="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  title="Upload file"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/18 bg-white/12 text-white/85 transition-colors hover:bg-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ boxShadow: CHAT_ACTION_SHADOW }}
                  title="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  {input.trim().length > 0 && <div className="mb-1 text-xs text-white/82">Drafting reply...</div>}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    enterKeyHint="enter"
                    placeholder="Type your message..."
                    rows={1}
                    maxLength={1000}
                    className="w-full min-h-[40px] max-h-[150px] resize-none rounded-xl border border-white/18 bg-white/94 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60"
                    style={{ resize: 'none', boxShadow: CHAT_INPUT_SHADOW }}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!canSend}
                  className={`w-12 h-12 rounded-xl border transition-all duration-200 ${
                    canSend
                      ? 'bg-gradient-to-r from-[#00A36C] to-[#008080] border-transparent text-white shadow-md hover:brightness-110'
                      : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      {imagePreview && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
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
    </motion.div>
  );
}

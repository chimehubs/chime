import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Send, Paperclip, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type ChatMessage, type ChatThread, type Profile } from '../../../services/supabaseDbService';
import { getClient, uploadFileToStorage } from '../../../services/supabaseClient';

interface AdminChatProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThreadRow = {
  thread: ChatThread;
  profile?: Profile | null;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
};

export default function AdminChat({ isOpen, onClose }: AdminChatProps) {
  const { user: adminUser } = useAuthContext();
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadThreads = async () => {
      const [threadsData, profiles] = await Promise.all([
        supabaseDbService.getAllChatThreads(),
        supabaseDbService.getAllProfiles(),
      ]);

      const profileById = new Map(profiles.map((p) => [p.id, p]));
      const threadIds = threadsData.map((t) => t.id);
      const allMessages = await supabaseDbService.getChatMessagesForThreads(threadIds);
      const messagesByThread = new Map<string, ChatMessage[]>();

      allMessages.forEach((msg) => {
        const list = messagesByThread.get(msg.thread_id) || [];
        list.push(msg);
        messagesByThread.set(msg.thread_id, list);
      });

      const rows = threadsData.map((thread) => {
        const msgs = messagesByThread.get(thread.id) || [];
        const lastMessage = msgs.length ? msgs[msgs.length - 1] : null;
        const unreadCount = msgs.filter((m) => m.sender_type === 'user' && !m.read).length;
        return {
          thread,
          profile: profileById.get(thread.user_id) || null,
          lastMessage,
          unreadCount,
        } as ThreadRow;
      });

      rows.sort((a, b) => {
        const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setThreads(rows);
      if (selectedThread) {
        const updated = rows.find((row) => row.thread.id === selectedThread.thread.id) || null;
        setSelectedThread(updated);
        setMessages(messagesByThread.get(selectedThread.thread.id) || []);
      }
    };

    loadThreads();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedThread) return;
    const client = getClient();
    if (!client) return;

    const channel = client
      .channel(`admin-chat:${selectedThread.thread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${selectedThread.thread.id}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_type === 'user') {
            setThreads((prev) =>
              prev.map((row) =>
                row.thread.id === selectedThread.thread.id
                  ? { ...row, unreadCount: row.unreadCount + 1, lastMessage: msg }
                  : row
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [selectedThread?.thread.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = async (row: ThreadRow) => {
    setSelectedThread(row);
    setView('chat');
    const threadMessages = await supabaseDbService.getChatMessages(row.thread.id);
    setMessages(threadMessages);
    await supabaseDbService.markThreadReadByAdmin(row.thread.id);
    setThreads((prev) =>
      prev.map((item) => (item.thread.id === row.thread.id ? { ...item, unreadCount: 0 } : item))
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedThread) return;
    await supabaseDbService.sendChatMessage({
      thread_id: selectedThread.thread.id,
      user_id: adminUser?.id || selectedThread.thread.user_id,
      sender_type: 'admin',
      message: input.trim(),
      attachment_url: null,
      read: false,
    });
    setInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedThread) return;
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const path = `${selectedThread.thread.user_id}/${Date.now()}-${file.name}`;
      const url = await uploadFileToStorage('chat-attachments', path, file);
      if (url) {
        await supabaseDbService.sendChatMessage({
          thread_id: selectedThread.thread.id,
          user_id: adminUser?.id || selectedThread.thread.user_id,
          sender_type: 'admin',
          message: file.name,
          attachment_url: url,
          read: false,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredThreads = threads.filter((row) => {
    const name = row.profile?.name || `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim();
    const email = row.profile?.email || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  const selectedProfileName = selectedThread?.profile?.name ||
    `${selectedThread?.profile?.first_name || ''} ${selectedThread?.profile?.last_name || ''}`.trim() ||
    selectedThread?.profile?.email || 'Customer';

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
        className="w-full sm:w-[500px] h-screen sm:h-[90vh] sm:rounded-3xl bg-white flex flex-col shadow-2xl"
      >
        {/* Header */}
        <motion.div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-4 flex items-center justify-between sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            {view === 'chat' && (
              <motion.button
                onClick={() => setView('list')}
                whileHover={{ scale: 1.1, rotate: -10 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#FFE5E5' }}
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: '#FF6B6B' }} />
              </motion.button>
            )}
            <div>
              <div className="text-base font-semibold">
                {view === 'list' ? 'Customer Support' : selectedProfileName}
              </div>
              {view === 'chat' && (
                <div className="flex items-center gap-2 mt-1">
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-green-500"
                  />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              )}
            </div>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {view === 'list' ? (
          // Conversation List View
          <div className="flex-1 flex flex-col overflow-hidden">
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
                  const userName = row.profile?.name || `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim() || 'Customer';
                  const userEmail = row.profile?.email || '';
                  const lastMessageTime = row.lastMessage?.created_at
                    ? new Date(row.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                    : '';

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
                            {lastMessageTime && (
                              <span className="text-xs text-muted-foreground">
                                {lastMessageTime}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {row.lastMessage?.message || 'No messages'}
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
          // Chat View
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-[#e6f9f4] flex items-center justify-center mb-3">
                    <User className="w-8 h-8 text-[#00b388]" />
                  </div>
                  <p className="text-sm">Start a conversation with {selectedProfileName}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const fileName = msg.message || '';
                  const ext = (fileName.split('.').pop() || '').toLowerCase();
                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                  const isVideo = ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
                  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
                  const timestamp = msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return msg.sender_type === 'user' ? (
                    <div key={msg.id} className="flex justify-start">
                      <Card className="max-w-[80%] p-4 rounded-xl bg-[#f3f4f6]">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-[#00b388] flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold">Customer</span>
                        </div>
                        {msg.attachment_url ? (
                          <div className="space-y-2">
                            {isImage && (
                              <img src={msg.attachment_url} alt={msg.message} className="max-w-full rounded-lg max-h-96" />
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
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline">
                                {msg.message}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm break-words">{msg.message}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">{timestamp}</div>
                      </Card>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-end">
                      <Card className="max-w-[80%] p-4 rounded-xl bg-[#00b388] text-white">
                        {msg.attachment_url ? (
                          <div className="space-y-2">
                            {isImage && (
                              <img src={msg.attachment_url} alt={msg.message} className="max-w-full rounded-lg max-h-96" />
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
                        ) : (
                          <div className="text-sm break-words">{msg.message}</div>
                        )}
                        <div className="text-xs text-white/70 mt-2">{timestamp}</div>
                      </Card>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 bg-white border-t border-border px-4 py-4 shadow-lg sm:rounded-b-3xl">
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
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 min-h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md"
                  maxLength={1000}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-12 h-12 bg-[#00b388] hover:bg-[#009670] text-white rounded-lg disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

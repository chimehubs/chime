// Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, User, Send, Paperclip } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type ChatMessage } from '../../../services/supabaseDbService';
import { getClient, uploadFileToStorage } from '../../../services/supabaseClient';

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [hasExistingMessages, setHasExistingMessages] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasRunAnimation = useRef(false);
  const welcomeMessage = 'Hello! Welcome to Chimahub customer support. How can we assist you today?';

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
      const thread = await supabaseDbService.getOrCreateChatThread(user.id);
      if (!thread?.id) return;
      setThreadId(thread.id);
      const existing = await supabaseDbService.getChatMessages(thread.id);
      setMessages(existing);
      setHasExistingMessages(existing.length > 0);
      await supabaseDbService.markThreadRead(thread.id, user.id);
    };
    loadChat();
  }, [user?.id]);

  useEffect(() => {
    if (!threadId) return;
    const client = getClient();
    if (!client) return;
    const channel = client
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
          setHasExistingMessages(true);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || input.length > 1000 || !user?.id) return;
    const thread = threadId || (await supabaseDbService.getOrCreateChatThread(user.id));
    if (!thread?.id) return;
    if (!threadId) setThreadId(thread.id);

    await supabaseDbService.sendChatMessage({
      thread_id: thread.id,
      user_id: user.id,
      sender_type: 'user',
      message: input.trim(),
      attachment_url: null,
      read: false,
    });

    setInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && user?.id) {
      const file = files[0];
      const thread = threadId || (await supabaseDbService.getOrCreateChatThread(user.id));
      if (!thread?.id) return;
      if (!threadId) setThreadId(thread.id);

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const url = await uploadFileToStorage('chat-attachments', path, file);
      if (url) {
        await supabaseDbService.sendChatMessage({
          thread_id: thread.id,
          user_id: user.id,
          sender_type: 'user',
          message: file.name,
          attachment_url: url,
          read: false,
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-white'
    }`}>
      {/* Chat Header */}
      <motion.div className={`sticky top-0 z-10 px-4 py-4 flex items-center gap-4 ${
        darkMode ? 'bg-[#0d1117]/80 border-[#21262d]' : 'bg-white border-b border-border'
      } border-b`}>
        <motion.button 
          onClick={() => navigate(getBackPath())}
          whileHover={{ scale: 1.1, rotate: -10 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
          style={{ backgroundColor: '#FFE5E5' }}
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#FF6B6B' }} />
        </motion.button>
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#e6f9f4' }}
        >
          <User className="w-5 h-5" style={{ color: '#00b388' }} />
        </motion.div>
        <div>
          <div className="text-base font-semibold">Customer Care</div>
          <div className="flex items-center gap-2 mt-1">
            <motion.span 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-500" 
            />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </motion.div>
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto px-6 py-6 ${
        darkMode ? 'bg-[#0d1117]' : 'bg-white'
      }`}>
        {/* Welcome Message with Typing Animation - Only show if no existing messages */}
        {!hasExistingMessages && (
          <div className="flex justify-start mb-4">
            <Card className={`max-w-[80%] p-4 rounded-xl ${
              darkMode ? 'bg-[#161b22]' : 'bg-[#f3f4f6]'
            }`}>
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#00b388] flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className={`text-xs font-semibold ${
                  darkMode ? 'text-[#e8eaed]' : 'text-foreground'
                }`}>Customer Care</span>
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#e8eaed]' : 'text-foreground'
              }`}>{displayedText}<span className={displayedText === welcomeMessage ? 'hidden' : 'inline-block w-1 h-4 ml-1 bg-[#00b388] animate-pulse'}></span></div>
              <div className={`text-xs mt-2 ${
                darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'
              }`}>Just now</div>
            </Card>
          </div>
        )}
        {/* Messages */}
        {messages.map((msg, idx) => {
          const fileName = msg.message || '';
          const ext = (fileName.split('.').pop() || '').toLowerCase();
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
          const isVideo = ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
          const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
          const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          return msg.sender_type === 'user' ? (
            <div key={msg.id} className="flex justify-end mb-4">
              <Card className="max-w-[80%] p-4 rounded-xl bg-[#00b388] text-white">
                {msg.attachment_url ? (
                  <div className="space-y-2">
                    {isImage && (
                      <img src={msg.attachment_url} alt={msg.message} className="max-w-full rounded-lg max-h-96" />
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
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline text-white/70">{msg.message}</a>
                    )}
                  </div>
                ) : (
                  <div className="text-sm break-words">{msg.message}</div>
                )}
                <div className="text-xs text-white/70 mt-2">{timestamp}</div>
              </Card>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start mb-4">
              <Card className={`max-w-[80%] p-4 rounded-xl ${
                darkMode ? 'bg-[#161b22]' : 'bg-[#f3f4f6]'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#00b388] flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className={`text-xs font-semibold ${
                    darkMode ? 'text-[#e8eaed]' : 'text-foreground'
                  }`}>Customer Care</span>
                </div>
                {msg.attachment_url ? (
                  <div className="space-y-2">
                    {isImage && (
                      <img src={msg.attachment_url} alt={msg.message} className="max-w-full rounded-lg max-h-96" />
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
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`text-sm underline ${
                        darkMode ? 'text-[#e8eaed]' : 'text-foreground'
                      }`}>{msg.message}</a>
                    )}
                  </div>
                ) : (
                  <div className={`text-sm break-words ${
                    darkMode ? 'text-[#e8eaed]' : 'text-foreground'
                  }`}>{msg.message}</div>
                )}
                <div className={`text-xs mt-2 ${
                  darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'
                }`}>{timestamp}</div>
              </Card>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div className={`sticky bottom-0 px-4 py-4 shadow-lg ${
        darkMode ? 'bg-[#0d1117]/80 border-[#21262d]' : 'bg-white border-t border-border'
      } border-t`}>
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
            onClick={() => fileInputRef.current?.click()}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              darkMode ? 'text-[#8b949e] hover:text-[#e8eaed]' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Upload file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your message..."
            className={`flex-1 min-h-12 border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md ${
              darkMode ? 'bg-[#161b22] text-[#e8eaed] placeholder-[#8b949e]' : 'bg-[#f9fafb]'
            }`}
            maxLength={1000}
          />
          <Button onClick={sendMessage} disabled={!input.trim()} className="w-12 h-12 bg-[#00b388] hover:bg-[#009670] text-white rounded-lg disabled:opacity-50 shadow-md hover:shadow-lg">
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className={`text-xs text-center mt-2 ${
          darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'
        }`}>Typical response time: 2-5 minutes</div>
      </div>
    </div>
  );
}



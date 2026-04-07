import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, Check } from 'lucide-react';
import { Card } from '../ui/card';
import { useNavigate } from 'react-router-dom';
import { supabaseDbService, type Notification as DbNotification } from '../../../services/supabaseDbService';
import { getClient } from '../../../services/supabaseClient';

export interface NotificationItem {
  id: string;
  type?: string;
  title?: string;
  message: string;
  timestamp?: string;
  read?: boolean;
  path?: string;
}

export default function NotificationDropdown({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const toItem = useCallback((n: DbNotification): NotificationItem => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.created_at ? new Date(n.created_at).toLocaleString() : '',
    read: n.read,
    path: n.path,
  }), []);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const items = await supabaseDbService.getNotifications(userId, 50);
    setNotifications(items.map(toItem));
  }, [toItem, userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const client = getClient();
    if (!client) return;

    const channel = client
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabaseDbService.markNotificationRead(id);
    void loadNotifications();
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) {
      await supabaseDbService.markNotificationsRead(userId);
      void loadNotifications();
    }
  }, [loadNotifications, userId]);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabaseDbService.deleteNotification(id);
  }, []);

  const handleOpenToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unreadCount > 0) {
      await markAllRead();
    }
  };

  const onClickNotification = async (n: NotificationItem) => {
    if (!n.read) {
      await markRead(n.id);
    }
    setOpen(false);
    if (n.path) navigate(n.path);
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
        onClick={() => void handleOpenToggle()}
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-slate-700 text-white rounded-full px-2 py-0.5 text-xs font-bold">{unreadCount}</span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Backdrop overlay - fully opaque to hide everything */}
          <div className="fixed inset-0 bg-black/50 z-[10000]" onClick={() => setOpen(false)}></div>
          {/* Centered card */}
          <Card className="fixed left-1/2 top-1/3 transform -translate-x-1/2 w-96 max-h-96 overflow-y-auto p-4 shadow-2xl z-[10001] bg-background border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-foreground" />
              <h2 className="text-lg font-semibold">Notifications</h2>
              <span className="text-sm text-muted-foreground ml-2">{notifications.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={() => void markAllRead()} className="text-sm text-muted-foreground hover:text-foreground">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent" title="Close notifications"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className={`p-2 rounded ${n.read ? 'bg-card' : 'bg-gradient-to-r from-white to-[#f0fdf4]'} border border-border`}> 
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-[#00b388]'}`}></span>
                        <div>
                          {n.title && <p className="text-sm font-semibold">{n.title}</p>}
                          <p className="text-sm text-muted-foreground mt-1">{n.timestamp || ''}</p>
                        </div>
                      </div>
                      <p className="text-sm mt-2">{n.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {!n.read && <button onClick={() => void markRead(n.id)} title="Mark read" className="p-1 rounded hover:bg-accent"><Check className="w-4 h-4" /></button>}
                        <button onClick={() => void deleteNotif(n.id)} title="Delete" className="p-1 rounded hover:bg-accent"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {n.path && <button onClick={() => void onClickNotification(n)} className="text-xs text-muted-foreground hover:text-foreground">Open</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </Card>
        </>,
        document.body
      )}
    </div>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ERPNotification } from '@/types/database';

export interface BroadcastMessage {
  id: string;
  badge?: string;
  message: string;
  link?: string;
  created_at: string;
}

interface NotificationState {
  notifications: ERPNotification[];
  broadcast: BroadcastMessage | null;
  addNotification: (notification: Omit<ERPNotification, 'id' | 'created_at' | 'read_by'>) => void;
  markAsRead: (id: string, username: string) => void;
  markAllAsRead: (username: string) => void;
  clearAll: () => void;
  getNotificationsForUser: (userRole?: string, branchId?: string) => ERPNotification[];
  getUnreadCount: (username?: string, userRole?: string, branchId?: string) => number;
  setBroadcast: (msg: BroadcastMessage | null) => void;
}

const INITIAL_NOTIFICATIONS: ERPNotification[] = [];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      broadcast: null,

      setBroadcast: (msg) => set({ broadcast: msg }),

      addNotification: (data) => {
        const newNotif: ERPNotification = {
          id: `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          ...data,
          created_at: new Date().toISOString(),
          read_by: [],
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50),
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('asopalav:notification-received', { detail: newNotif })
          );
        }
      },

      markAsRead: (id: string, username: string) => {
        if (!username) return;
        set((state) => ({
          notifications: state.notifications.map((n) => {
            if (n.id === id && !n.read_by.includes(username)) {
              return { ...n, read_by: [...n.read_by, username] };
            }
            return n;
          }),
        }));
      },

      markAllAsRead: (username: string) => {
        if (!username) return;
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read_by: n.read_by.includes(username) ? n.read_by : [...n.read_by, username],
          })),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      getNotificationsForUser: (userRole = 'Super_Admin', branchId) => {
        const { notifications } = get();
        return notifications.filter((n) => {
          const roleMatches =
            userRole === 'Super_Admin' ||
            n.target_roles.includes(userRole) ||
            n.target_roles.includes('*');
          const branchMatches = !branchId || !n.branch_id || n.branch_id === branchId || n.branch_id === '*';
          return roleMatches && branchMatches;
        });
      },

      getUnreadCount: (username = '', userRole = 'Super_Admin', branchId) => {
        const notifs = get().getNotificationsForUser(userRole, branchId);
        if (!username) return notifs.length;
        return notifs.filter((n) => !n.read_by.includes(username)).length;
      },
    }),
    {
      name: 'asopalav-erp-notifications-storage',
    }
  )
);

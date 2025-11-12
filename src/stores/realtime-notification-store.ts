'use client';

import { create } from 'zustand';
import { db } from '@/config/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';

// Sound configuration
interface SoundConfig {
  tutor: string;
  student: string;
  admin: string;
  default: string;
}

// Default sound URLs (you can replace these with your own MP3 files)
const DEFAULT_SOUNDS: SoundConfig = {
  tutor: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Replace with your tutor MP3
  student: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Replace with your student MP3
  admin: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Replace with your admin MP3
  default: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Replace with your default MP3
};

// Local sound files (place these in your public folder)
const LOCAL_SOUNDS: SoundConfig = {
  tutor: '/sounds/tutor-notification.mp3',
  student: '/sounds/student-notification.mp3', 
  admin: '/sounds/admin-notification.mp3',
  default: '/sounds/default-notification.mp3'
};

// Audio cache to avoid reloading sounds
const audioCache = new Map<string, HTMLAudioElement>();

// Initialize audio context on user interaction (required for autoplay policies)
let audioContextInitialized = false;
const initializeAudioContext = () => {
  if (audioContextInitialized) return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!(window as any).__notificationAudioContext) {
      (window as any).__notificationAudioContext = new AudioContextClass();
    }
    audioContextInitialized = true;
    console.log('✅ Audio context initialized');
  } catch (error) {
    console.warn('⚠️ Could not initialize audio context:', error);
  }
};

// Initialize on any user interaction
if (typeof window !== 'undefined') {
  const initEvents = ['click', 'touchstart', 'keydown'];
  const initOnce = () => {
    initializeAudioContext();
    initEvents.forEach(event => {
      document.removeEventListener(event, initOnce);
    });
  };
  initEvents.forEach(event => {
    document.addEventListener(event, initOnce, { once: true });
  });
}

// Function to load and cache audio
const loadAudio = async (url: string): Promise<HTMLAudioElement> => {
  if (audioCache.has(url)) {
    return audioCache.get(url)!;
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = 0.5; // Default volume
    
    // Set timeout for loading
    const timeout = setTimeout(() => {
      reject(new Error('Audio loading timeout'));
    }, 5000);
    
    audio.addEventListener('canplaythrough', () => {
      clearTimeout(timeout);
      audioCache.set(url, audio);
      resolve(audio);
    }, { once: true });
    
    audio.addEventListener('error', (e) => {
      clearTimeout(timeout);
      console.error(`Failed to load audio: ${url}`, e);
      reject(e);
    }, { once: true });
    
    // Try to load the audio
    audio.load();
  });
};

// Function to request notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notification permission denied');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Function to show browser notification
const showBrowserNotification = async (notification: AdminNotification) => {
  try {
    // Check if browser notifications are enabled in settings
    const browserNotificationsEnabled = localStorage.getItem('browserNotificationsEnabled');
    if (browserNotificationsEnabled === 'false') {
      console.log('🔕 Browser notifications are disabled in settings');
      return;
    }

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('⚠️ Cannot show browser notification: permission denied. Please enable notifications in your browser settings.');
      return;
    }

    // Check if page is visible - don't show notification if user is already viewing the page
    // (optional: you can remove this if you want notifications even when page is visible)
    if (document.visibilityState === 'visible') {
      console.log('📱 Page is visible, showing notification anyway');
    }

    // Create notification
    const title = `${notification.senderNickname || notification.senderName} - New Message`;
    const body = notification.content || notification.message || 'New notification';
    
    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
      body: body,
      icon: '/notification-icon.svg', // Custom notification icon
      badge: '/notification-icon.svg',
      tag: `notification-${notification.id}`, // Prevent duplicate notifications
      requireInteraction: false,
      silent: false, // Set to false to allow system sound (browser may still play default sound)
      vibrate: [200, 100, 200], // Vibrate pattern (if supported on mobile devices)
      data: {
        requestId: notification.requestId,
        notificationId: notification.id,
        senderType: notification.senderType,
        timestamp: notification.timestamp?.toDate ? notification.timestamp.toDate().getTime() : Date.now()
      }
    };
    
    const browserNotification = new Notification(title, notificationOptions);

    // Handle notification click
    browserNotification.onclick = () => {
      window.focus();
      // Open the request detail page in a new tab
      if (notification.requestId) {
        window.open(`/dashboard/requests/${notification.requestId}`, '_blank');
      }
      browserNotification.close();
    };

    // Handle notification close
    browserNotification.onclose = () => {
      console.log(`📬 Browser notification closed: ${notification.id}`);
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (browserNotification) {
        browserNotification.close();
      }
    }, 5000);

    console.log(`✅ Browser notification shown for ${notification.senderType}: ${notification.senderName || notification.senderNickname}`);
  } catch (error: any) {
    console.error('❌ Error showing browser notification:', error.message);
  }
};

// Function to play notification sound based on sender type
const playNotificationSound = async (senderType: 'student' | 'tutor' | 'admin' | 'default' = 'default') => {
  try {
    // Check if sound is enabled
    const soundEnabled = localStorage.getItem('notificationSoundEnabled');
    if (soundEnabled === 'false') {
      console.log('🔇 Notification sound is disabled in settings');
      return;
    }

    // Ensure audio context is initialized
    initializeAudioContext();

    // Get volume setting
    const volumeSetting = localStorage.getItem('notificationVolume');
    const volume = volumeSetting ? parseFloat(volumeSetting) / 100 : 0.5;

    // Try local sounds first, then fallback to default sounds
    const soundUrl = LOCAL_SOUNDS[senderType] || DEFAULT_SOUNDS[senderType] || DEFAULT_SOUNDS.default;
    
    try {
      const audio = await loadAudio(soundUrl);
      audio.currentTime = 0; // Reset to beginning
      audio.volume = volume; // Set volume from settings
      
      // Play the audio - handle autoplay policy
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log(`🔊 Playing ${senderType} notification sound at ${(volume * 100).toFixed(0)}% volume`);
      }
    } catch (audioError: any) {
      console.warn(`⚠️ Failed to play ${senderType} sound from ${soundUrl}, trying fallback:`, audioError.message);
      
      // Fallback to Web Audio API
      await playFallbackSound(senderType, volume);
    }
  } catch (error: any) {
    console.error('❌ Could not play notification sound:', error.message);
    // Final fallback to basic beep
    try {
      await playFallbackSound(senderType, 0.5);
    } catch (fallbackError) {
      console.error('❌ Fallback sound also failed:', fallbackError);
    }
  }
};

// Fallback sound using Web Audio API
const playFallbackSound = async (senderType: 'student' | 'tutor' | 'admin' | 'default' = 'default', volume: number = 0.5) => {
  try {
    // Resume audio context if suspended (required by browser autoplay policies)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let audioContext: AudioContext;
    
    // Try to get existing context or create new one
    if ((window as any).__notificationAudioContext) {
      audioContext = (window as any).__notificationAudioContext;
    } else {
      audioContext = new AudioContextClass();
      (window as any).__notificationAudioContext = audioContext;
    }
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different sender types
    const frequencies = {
      student: [600, 800], // Higher pitch for students
      tutor: [400, 600],   // Lower pitch for tutors
      admin: [500, 700],  // Medium pitch for admin
      default: [600, 800] // Default pitch
    };
    
    const freq = frequencies[senderType] || frequencies.default;
    const now = audioContext.currentTime;
    
    // Create a pleasant notification sound (two quick beeps)
    oscillator.frequency.setValueAtTime(freq[0], now);
    oscillator.frequency.setValueAtTime(freq[1], now + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.11);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    
    oscillator.start(now);
    oscillator.stop(now + 0.2);
    
    console.log(`🔊 Playing fallback ${senderType} notification sound at ${(volume * 100).toFixed(0)}% volume`);
  } catch (fallbackError: any) {
    console.error('❌ Fallback audio failed:', fallbackError.message);
  }
};

interface AdminNotification {
  id: string;
  type: string;
  requestId: string;
  chatId: string;
  senderType: 'student' | 'tutor' | 'admin';
  senderId: string;
  senderName: string;
  senderNickname: string;
  message: string;
  content: string;
  timestamp: any;
  seen: boolean;
  createdAt: any;
  updatedAt: any;
}

interface NotificationState {
  notifications: AdminNotification[];
  unseenCount: number;
  isLoading: boolean;
  error: string | null;
  previousNotificationCount: number;
  previousNotificationIds: Set<string>;
}

interface NotificationActions {
  setNotifications: (notifications: AdminNotification[]) => void;
  markAsSeen: (notificationId: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRealtimeNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  notifications: [],
  unseenCount: 0,
  isLoading: false,
  error: null,
  previousNotificationCount: 0,
  previousNotificationIds: new Set<string>(), // Track previous notification IDs

  setNotifications: (notifications) => {
    const unseenCount = notifications.filter(n => !n.seen).length;
    const state = get();
    const prevNotifications = state.notifications || [];
    const prevIds = state.previousNotificationIds || new Set<string>();
    
    // Get current notification IDs
    const currentIds = new Set(notifications.map(n => n.id));
    
    // Find truly new notifications (not in previous set)
    const newNotifications = notifications.filter(n => !prevIds.has(n.id));
    
    // Only trigger notifications if:
    // 1. There are new notifications (not just initial load)
    // 2. We have previous notifications (to avoid triggering on first load)
    if (newNotifications.length > 0 && prevNotifications.length > 0) {
      console.log(`🔔 New notification(s) received: ${newNotifications.length}`);
      
      // Process each new notification
      newNotifications.forEach((notification, index) => {
        // Add small delay between notifications to avoid overlapping sounds
        setTimeout(() => {
          console.log(`🔔 Processing notification: ${notification.id} from ${notification.senderType}`);
          
          // Play sound and show browser notification
          playNotificationSound(notification.senderType).catch(err => {
            console.error('Error playing notification sound:', err);
          });
          
          showBrowserNotification(notification).catch(err => {
            console.error('Error showing browser notification:', err);
          });
        }, index * 200); // 200ms delay between each notification
      });
    } else if (newNotifications.length > 0 && prevNotifications.length === 0) {
      // First load - just log, don't trigger notifications
      console.log(`📬 Initial load: ${notifications.length} notifications loaded`);
    }
    
    set({ 
      notifications, 
      unseenCount, 
      previousNotificationCount: notifications.length,
      previousNotificationIds: currentIds
    });
  },

  markAsSeen: async (notificationId) => {
    try {
      const notificationRef = doc(db, 'admin_notifications', notificationId);
      await updateDoc(notificationRef, {
        seen: true,
        updatedAt: new Date()
      });
      
      // Update local state
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, seen: true } : n
        ),
        unseenCount: state.unseenCount - 1
      }));
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      set({ error: 'Failed to mark notification as seen' });
    }
  },

  markAllAsSeen: async () => {
    try {
      const { notifications } = get();
      const unseenNotifications = notifications.filter(n => !n.seen);
      
      if (unseenNotifications.length === 0) {
        console.log('No unseen notifications to mark');
        return;
      }
      
      console.log(`Marking ${unseenNotifications.length} notifications as seen`);
      
      const updatePromises = unseenNotifications.map(notification => 
        updateDoc(doc(db, 'admin_notifications', notification.id), {
          seen: true,
          updatedAt: new Date()
        })
      );
      
      await Promise.all(updatePromises);
      
      // Update local state immediately
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, seen: true })),
        unseenCount: 0
      }));
      
      console.log('All notifications marked as seen successfully');
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
      set({ error: 'Failed to mark all notifications as seen' });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// Hook to setup realtime listener
export function useRealtimeNotifications() {
  const { setNotifications, setLoading, setError } = useRealtimeNotificationStore();

  useEffect(() => {
    setLoading(true);
    
    const notificationsRef = collection(db, 'admin_notifications');
    const q = query(
      notificationsRef, 
      orderBy('createdAt', 'desc'), 
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminNotification[];
      
      setNotifications(notifications);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error listening to notifications:', err);
      setError('Failed to load notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setNotifications, setLoading, setError]);
}

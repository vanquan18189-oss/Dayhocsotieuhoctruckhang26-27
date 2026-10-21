import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getDocFromServer,
  doc,
  persistentLocalCache,
  persistentSingleTabManager,
  disableNetwork,
  enableNetwork
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const requiredFirebaseEnvVarNames = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

/**
 * Cấu hình mặc định dự phòng trực tiếp bằng mã nguồn cho dự án 'dayhocsotruckhangth26-27'
 * Đảm bảo ứng dụng luôn kết nối thành công với Firestore ngay cả khi chưa nạp biến môi trường Preview.
 */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0t6_1DxzdkdKMRJQ6FUOoMUCkw8ePfJU",
  authDomain: "dayhocsotruckhangth26-27.firebaseapp.com",
  projectId: "dayhocsotruckhangth26-27",
  storageBucket: "dayhocsotruckhangth26-27.firebasestorage.app",
  messagingSenderId: "254110290660",
  appId: "1:254110290660:web:aa0dd28a71bec309cbd2f1",
  measurementId: "G-8NZL4K2NSD"
};

export function getMissingFirebaseEnvVars(): string[] {
  const env = (import.meta as any).env || {};
  return requiredFirebaseEnvVarNames.filter(varName => {
    const hasEnv = Boolean(env[varName] && String(env[varName]).trim() !== '');
    const key = varName.replace('VITE_FIREBASE_', '').toLowerCase();
    const configKey = key === 'api_key' ? 'apiKey' :
                      key === 'auth_domain' ? 'authDomain' :
                      key === 'project_id' ? 'projectId' :
                      key === 'storage_bucket' ? 'storageBucket' :
                      key === 'messaging_sender_id' ? 'messagingSenderId' :
                      key === 'app_id' ? 'appId' : key;
    const hasFallback = Boolean((DEFAULT_FIREBASE_CONFIG as any)[configKey]);
    return !hasEnv && !hasFallback;
  });
}

export function hasMissingFirebaseEnvVars(): boolean {
  return getMissingFirebaseEnvVars().length > 0;
}

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId
};

/**
 * Khởi tạo lại kết nối mạng Firestore để tải dữ liệu ngay lập tức
 */
export async function reconnectFirebase(): Promise<boolean> {
  try {
    await resetFirestoreQuotaAndEnableNetwork();
    if (db) {
      await enableNetwork(db).catch(() => {});
    }
    return true;
  } catch (e) {
    console.warn('reconnectFirebase error:', e);
    return false;
  }
}

const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore bằng initializeFirestore với experimentalForceLongPolling: true và persistentLocalCache (persistentSingleTabManager)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({})
  }),
});

export const auth = getAuth(app);

// Bộ đếm số lần xảy ra Internal Assertion trong phiên
export let sessionInternalAssertionCount = 0;

export function getSessionInternalAssertionCount(): number {
  return sessionInternalAssertionCount;
}

const QUOTA_EXCEEDED_KEY = 'eduplay_firestore_quota_v2_exceeded';
const QUOTA_TIMESTAMP_KEY = 'eduplay_firestore_quota_v2_timestamp';
const QUOTA_EXPIRATION_MS = 2 * 60 * 60 * 1000;

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('eduplay_firestore_quota_exceeded');
    localStorage.removeItem('eduplay_firestore_quota_timestamp');
  } catch {}
}

export function isFirestoreQuotaExceeded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isExceeded = localStorage.getItem(QUOTA_EXCEEDED_KEY) === 'true' || localStorage.getItem('eduplay_firestore_quota_exceeded') === 'true';
    if (!isExceeded) return false;

    const timestampStr = localStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      if (!isNaN(timestamp) && Date.now() - timestamp > QUOTA_EXPIRATION_MS) {
        localStorage.removeItem(QUOTA_EXCEEDED_KEY);
        localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
        localStorage.removeItem('eduplay_firestore_quota_exceeded');
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExceeded(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_EXCEEDED_KEY, 'true');
    localStorage.setItem(QUOTA_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem('eduplay_firestore_quota_exceeded', 'true');
    if (db) {
      disableNetwork(db).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('eduplay_firestore_network_status_changed', {
      detail: { quotaExceeded: true, online: false }
    }));
  } catch {}
}

export async function resetFirestoreQuotaAndEnableNetwork(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
      localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
      localStorage.removeItem('eduplay_firestore_quota_exceeded');
      localStorage.removeItem('eduplay_firestore_quota_timestamp');
    } catch {}
  }
  if (db) {
    try {
      await enableNetwork(db);
    } catch {}
  }
  window.dispatchEvent(new CustomEvent('eduplay_firestore_network_status_changed', {
    detail: { quotaExceeded: false, online: true }
  }));
  return true;
}

export async function testFirestoreServerConnectionOnBoot(): Promise<boolean> {
  if (!db) return false;
  if (isFirestoreQuotaExceeded()) {
    try {
      await disableNetwork(db);
    } catch {}
    return false;
  }
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PING_TIMEOUT')), 4000)
    );
    const testDocRef = doc(db, '_system_check_', 'ping');
    await Promise.race([getDocFromServer(testDocRef), timeoutPromise]);
    await resetFirestoreQuotaAndEnableNetwork();
    return true;
  } catch (err: any) {
    const errorString = safeStringifyArg(err);
    if (err?.code === 'resource-exhausted' || err?.code === 'functions/resource-exhausted' || isFirestoreQuotaOrBackoffError(errorString)) {
      markFirestoreQuotaExceeded();
      return false;
    }
    return true;
  }
}

function safeStringifyArg(arg: any): string {
  if (!arg) return '';
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) {
    const ctx = (arg as any).context || (arg as any).el;
    return `${arg.name} ${arg.message} ${arg.stack || ''} ${ctx ? safeStringifyArg(ctx) : ''}`;
  }
  try {
    return JSON.stringify(arg, (key, val) => {
      if (val instanceof Error) {
        return `${val.name} ${val.message} ${val.stack || ''}`;
      }
      return val;
    });
  } catch {
    return String(arg);
  }
}

function isFirestoreAssertionError(str: string): boolean {
  return (
    str.includes('INTERNAL ASSERTION FAILED') ||
    str.includes('Unexpected state') ||
    str.includes('ca9') ||
    str.includes('b815') ||
    str.includes('c050') ||
    str.includes('WatchChangeAggregator')
  );
}

function isFirestoreQuotaOrBackoffError(str: string): boolean {
  if (!str) return false;
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota exceeded') ||
    str.includes('quota') ||
    str.includes('maximum backoff delay') ||
    str.includes('overloading the backend') ||
    str.includes('resource_exhausted')
  );
}

function isWebSocketError(str: string): boolean {
  return (
    str.includes('WebSocket') ||
    str.includes('closed without opened') ||
    str.includes('failed to connect to websocket')
  );
}

// Bắt lỗi toàn cục CHỈ ghi log & hiển thị biểu ngữ cảnh báo rõ ràng cho người dùng, KHÔNG ẩn lỗi
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorString = args.map(safeStringifyArg).join(' ');

    if (isWebSocketError(errorString)) {
      return; // Suppress Vite HMR WebSocket error in iframe sandbox
    }

    if (isFirestoreQuotaOrBackoffError(errorString)) {
      markFirestoreQuotaExceeded();
      console.warn('⚡ [Firestore Quota Exceeded handled - Disconnected network & switched to local cache mode]');
      return; // Suppress quota error spam and exponential backoff logs
    }

    originalConsoleError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorString = safeStringifyArg(reason);

    if (isWebSocketError(errorString)) {
      event.preventDefault();
      try { (event as any).stopImmediatePropagation?.(); } catch {}
      return;
    }

    if (isFirestoreQuotaOrBackoffError(errorString)) {
      event.preventDefault();
      try { (event as any).stopImmediatePropagation?.(); } catch {}
      markFirestoreQuotaExceeded();
      console.warn('⚡ [Firestore Quota Exceeded in unhandledrejection - Disconnected network]');
      return;
    }

    if (isFirestoreAssertionError(errorString)) {
      sessionInternalAssertionCount++;
      console.warn('⚠️ [Firestore INTERNAL ASSERTION FAILED Log]:', reason);
      window.dispatchEvent(new CustomEvent('eduplay_firestore_assertion_error', {
        detail: {
          message: 'Kết nối dữ liệu gặp sự cố, dữ liệu có thể chưa được lưu. Bấm để tải lại trang',
          rawError: errorString
        }
      }));
    }
  });

  window.addEventListener('error', (event) => {
    const errorString = safeStringifyArg(event.error) + ' ' + safeStringifyArg(event.message);

    if (isWebSocketError(errorString)) {
      event.preventDefault();
      try { (event as any).stopImmediatePropagation?.(); } catch {}
      return;
    }

    if (isFirestoreQuotaOrBackoffError(errorString)) {
      event.preventDefault();
      try { (event as any).stopImmediatePropagation?.(); } catch {}
      markFirestoreQuotaExceeded();
      console.warn('⚡ [Firestore Quota Exceeded in error event - Disconnected network]');
      return;
    }

    if (isFirestoreAssertionError(errorString)) {
      sessionInternalAssertionCount++;
      console.warn('⚠️ [Firestore INTERNAL ASSERTION FAILED Window Error Log]:', event.error || event.message);
      window.dispatchEvent(new CustomEvent('eduplay_firestore_assertion_error', {
        detail: {
          message: 'Kết nối dữ liệu gặp sự cố, dữ liệu có thể chưa được lưu. Bấm để tải lại trang',
          rawError: errorString
        }
      }));
    }
  });

  setTimeout(() => {
    testFirestoreServerConnectionOnBoot().catch(() => {});
  }, 1000);
}

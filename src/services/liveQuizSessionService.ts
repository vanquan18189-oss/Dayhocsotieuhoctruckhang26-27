import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

export interface LiveQuizParticipant {
  id: string; // doc ID: targetId_studentId
  targetId: string; // assignmentId or examId
  targetTitle: string;
  subject?: string;
  grade?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentAvatar?: string;
  status: 'in_progress' | 'completed' | 'left';
  answeredCount: number;
  totalQuestions: number;
  score?: number; // scale 0-10
  scoreStr?: string; // e.g. "10.0 / 10"
  percentage?: number; // 0 - 100
  timeSpentSeconds?: number;
  startedAt?: number;
  updatedAt?: number;
  completedAt?: number;
}

const COLLECTION_NAME = 'quiz_live_sessions';
const LOCAL_STORAGE_KEY_PREFIX = 'eduplay_live_quiz_';

// Helper to sanitize doc ID for Firestore
function getDocId(targetId: string, studentId: string): string {
  const cleanTarget = String(targetId || 'target').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudent = String(studentId || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanTarget}_${cleanStudent}`;
}

// Clean up any legacy seed records & old cached quiz sessions from localStorage
function cleanupLegacySeedStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Remove all old live quiz local cache and any legacy mock seed keys
      if (
        k.startsWith(LOCAL_STORAGE_KEY_PREFIX) ||
        k.includes('seed_st_') ||
        k.includes('eduplay_mock')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

// Run cleanup immediately on load to purge all old mock entries from client browser
cleanupLegacySeedStorage();

/**
 * Join live quiz session (student starts answering)
 */
export async function joinQuizLiveSession(params: {
  targetId: string;
  targetTitle: string;
  subject?: string;
  grade?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentAvatar?: string;
  totalQuestions: number;
}): Promise<void> {
  const {
    targetId,
    targetTitle,
    subject = 'Tin học',
    grade = 'Khối 5',
    studentId,
    studentName,
    studentClass,
    studentAvatar = '🌟',
    totalQuestions
  } = params;

  if (!targetId || !studentId || !getAdminGlobalLiveMode()) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  const data: LiveQuizParticipant = {
    id: docId,
    targetId,
    targetTitle,
    subject,
    grade,
    studentId,
    studentName,
    studentClass,
    studentAvatar,
    status: 'in_progress',
    answeredCount: 0,
    totalQuestions: totalQuestions || 10,
    startedAt: now,
    updatedAt: now
  };

  // 1. Save local backup
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  // 2. Sync to Firestore
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Firestore joinQuizLiveSession error:', err);
  }
}

export function getAdminGlobalLiveMode(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('eduplay_admin_global_live_mode') !== 'false';
}

export function setAdminGlobalLiveMode(val: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eduplay_admin_global_live_mode', val ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('eduplay_admin_live_mode_updated', { detail: val }));
}

/**
 * Update quiz progress (when student answers questions or switches question)
 * Throttled to max 1 write per 10 seconds, and paused when document.hidden
 */
let lastUpdateTimeMap: Record<string, number> = {};

export async function updateQuizLiveProgress(params: {
  targetId: string;
  studentId: string;
  answeredCount: number;
  totalQuestions?: number;
}): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!getAdminGlobalLiveMode()) return;
  const { targetId, studentId, answeredCount, totalQuestions } = params;
  if (!targetId || !studentId || !db) return;

  const now = Date.now();
  const throttleKey = `${targetId}_${studentId}`;
  const lastTime = lastUpdateTimeMap[throttleKey] || 0;
  if (now - lastTime < 10000) {
    return;
  }
  lastUpdateTimeMap[throttleKey] = now;

  const docId = getDocId(targetId, studentId);
  const safeAnsweredCount = Math.max(0, Math.floor(Number(answeredCount) || 0));

  try {
    if (!db) return;
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(
      docRef,
      {
        answeredCount: safeAnsweredCount,
        ...(totalQuestions ? { totalQuestions } : {}),
        updatedAt: now,
        status: 'in_progress'
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore updateQuizLiveProgress error:', err);
  }
}

/**
 * Complete quiz live session (when student submits)
 */
export async function completeQuizLiveSession(params: {
  targetId: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  studentAvatar?: string;
  score: number;
  scoreStr?: string;
  percentage?: number;
  totalQuestions: number;
  answeredCount?: number;
  timeSpentSeconds?: number;
}): Promise<void> {
  const {
    targetId,
    studentId,
    studentName,
    studentClass,
    studentAvatar,
    score,
    scoreStr,
    percentage,
    totalQuestions,
    answeredCount,
    timeSpentSeconds
  } = params;

  if (!targetId || !studentId) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  const patch: Partial<LiveQuizParticipant> = {
    status: 'completed',
    score: typeof score === 'number' ? score : parseFloat(String(score)) || 0,
    scoreStr: scoreStr || `${score.toFixed(1)} / 10`,
    percentage: percentage !== undefined ? percentage : Math.round(((score || 0) / 10) * 100),
    answeredCount: answeredCount || totalQuestions,
    totalQuestions,
    timeSpentSeconds: timeSpentSeconds || 300,
    completedAt: now,
    updatedAt: now
  };

  if (studentName) patch.studentName = studentName;
  if (studentClass) patch.studentClass = studentClass;
  if (studentAvatar) patch.studentAvatar = studentAvatar;

  // 1. Update local storage
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`;
    const raw = localStorage.getItem(localKey);
    let parsed: any = {};
    if (raw) parsed = JSON.parse(raw);
    Object.assign(parsed, patch);
    localStorage.setItem(localKey, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  // 2. Update Firestore
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, patch, { merge: true });
  } catch (err) {
    console.warn('Firestore completeQuizLiveSession error:', err);
  }
}

/**
 * Leave quiz session without completing
 */
export async function leaveQuizLiveSession(params: {
  targetId: string;
  studentId: string;
}): Promise<void> {
  const { targetId, studentId } = params;
  if (!targetId || !studentId || !db) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`;
    localStorage.removeItem(localKey);
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  try {
    if (!db) return;
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, { status: 'left', updatedAt: now }, { merge: true });
  } catch (err) {
    console.warn('Firestore leaveQuizLiveSession error:', err);
  }
}

/**
 * Subscribe to real-time participants for a specific targetId (Exam / Assignment)
 */
export function subscribeQuizLiveParticipants(
  targetId: string,
  targetTitle: string,
  totalQuestions: number,
  onUpdate: (data: {
    completedList: LiveQuizParticipant[];
    inProgressList: LiveQuizParticipant[];
    totalCompleted: number;
    totalInProgress: number;
  }) => void,
  filterClass?: string
): () => void {
  if (!targetId || !db || !getAdminGlobalLiveMode()) {
    onUpdate({ completedList: [], inProgressList: [], totalCompleted: 0, totalInProgress: 0 });
    return () => {};
  }

  const processAndNotify = (firestoreDocs: LiveQuizParticipant[]) => {
    // 100% Real Firestore data source - no localStorage mock scanning
    const map = new Map<string, LiveQuizParticipant>();

    firestoreDocs.forEach(docData => {
      if (docData && docData.studentId && !docData.studentId.startsWith('seed_st_')) {
        // Enforce non-negative answeredCount
        const safeAnsweredCount = Math.max(0, Math.floor(Number(docData.answeredCount) || 0));
        map.set(docData.studentId, {
          ...docData,
          answeredCount: safeAnsweredCount
        });
      }
    });

    const all = Array.from(map.values()).filter(p => !p.studentId?.startsWith('seed_st_'));

    // 1. Completed list (Leaderboard) - strictly from docs with status === 'completed', Top 5
    // Sort: score DESC, then completedAt ASC / timeSpentSeconds ASC
    const completedList = all
      .filter(p => p.status === 'completed' && p.score !== undefined && !isNaN(Number(p.score)))
      .sort((a, b) => {
        const scoreA = Number(a.score) || 0;
        const scoreB = Number(b.score) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.timeSpentSeconds || 9999;
        const timeB = b.timeSpentSeconds || 9999;
        if (timeA !== timeB) return timeA - timeB;
        return (a.completedAt || 0) - (b.completedAt || 0);
      })
      .slice(0, 5);

    // 2. In progress list - strictly from docs with status === 'in_progress', max 10, filtered by student's class if provided
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    let inProgressFiltered = all
      .filter(p => p.status === 'in_progress' && p.updatedAt && p.updatedAt > fifteenMinutesAgo);

    if (filterClass) {
      const targetClsNorm = filterClass.toLowerCase().replace(/\s+/g, '');
      inProgressFiltered = inProgressFiltered.filter(p => {
        const pClsNorm = (p.studentClass || '').toLowerCase().replace(/\s+/g, '');
        return pClsNorm === targetClsNorm || pClsNorm.includes(targetClsNorm) || targetClsNorm.includes(pClsNorm);
      });
    }

    const inProgressList = inProgressFiltered
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10);

    onUpdate({
      completedList,
      inProgressList,
      totalCompleted: all.filter(p => p.status === 'completed').length,
      totalInProgress: inProgressList.length
    });
  };

  // Firestore query onSnapshot - single source of real-time truth
  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(collection(db, COLLECTION_NAME), where('targetId', '==', targetId));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const docs: LiveQuizParticipant[] = [];
        snapshot.forEach(docSnap => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as LiveQuizParticipant);
        });
        processAndNotify(docs);
      },
      (error) => {
        console.warn('Firestore onSnapshot live quiz warning:', error);
        processAndNotify([]);
      }
    );
  } catch (err) {
    console.warn('Error creating Firestore live quiz snapshot query:', err);
    processAndNotify([]);
  }

  // Cleanup
  return () => {
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/**
 * One-shot fetch for teacher view when liveMode = false (saves Firestore read quota)
 */
export async function fetchQuizLiveParticipantsOnce(
  targetId: string,
  filterClass?: string
): Promise<{
  completedList: LiveQuizParticipant[];
  inProgressList: LiveQuizParticipant[];
  totalCompleted: number;
  totalInProgress: number;
}> {
  if (!targetId || !db) {
    return { completedList: [], inProgressList: [], totalCompleted: 0, totalInProgress: 0 };
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), where('targetId', '==', targetId));
    const snapshot = await getDocs(q);
    const map = new Map<string, LiveQuizParticipant>();

    snapshot.forEach(docSnap => {
      const docData = docSnap.data() as LiveQuizParticipant;
      if (docData && docData.studentId && !docData.studentId.startsWith('seed_st_')) {
        const safeAnsweredCount = Math.max(0, Math.floor(Number(docData.answeredCount) || 0));
        map.set(docData.studentId, {
          ...docData,
          id: docSnap.id,
          answeredCount: safeAnsweredCount
        });
      }
    });

    const all = Array.from(map.values()).filter(p => !p.studentId?.startsWith('seed_st_'));

    const completedList = all
      .filter(p => p.status === 'completed' && p.score !== undefined && !isNaN(Number(p.score)))
      .sort((a, b) => {
        const scoreA = Number(a.score) || 0;
        const scoreB = Number(b.score) || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const timeA = a.timeSpentSeconds || 9999;
        const timeB = b.timeSpentSeconds || 9999;
        if (timeA !== timeB) return timeA - timeB;
        return (a.completedAt || 0) - (b.completedAt || 0);
      })
      .slice(0, 5);

    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    let inProgressFiltered = all
      .filter(p => p.status === 'in_progress' && p.updatedAt && p.updatedAt > fifteenMinutesAgo);

    if (filterClass) {
      const targetClsNorm = filterClass.toLowerCase().replace(/\s+/g, '');
      inProgressFiltered = inProgressFiltered.filter(p => {
        const pClsNorm = (p.studentClass || '').toLowerCase().replace(/\s+/g, '');
        return pClsNorm === targetClsNorm || pClsNorm.includes(targetClsNorm) || targetClsNorm.includes(pClsNorm);
      });
    }

    const inProgressList = inProgressFiltered
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10);

    return {
      completedList,
      inProgressList,
      totalCompleted: all.filter(p => p.status === 'completed').length,
      totalInProgress: inProgressList.length
    };
  } catch (err) {
    console.warn('fetchQuizLiveParticipantsOnce error:', err);
    return { completedList: [], inProgressList: [], totalCompleted: 0, totalInProgress: 0 };
  }
}

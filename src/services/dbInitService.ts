import { db } from './firebase';
import { collection, getDocs, doc } from 'firebase/firestore';
import { trackedWriteBatch, extractFirestoreErrorDetails } from './firestoreWriteTracker';
import {
  INITIAL_LESSONS,
  INITIAL_QUESTIONS
} from './mockData';


export async function initializeAndSyncAllCollections(): Promise<{ success: boolean; message: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('eduplay_firestore_quota_exceeded') === 'true') {
    return { success: true, message: 'Firestore quota exceeded previously. Using local cache mode.' };
  }
  try {
    if (!db) {
      return { success: false, message: 'Chưa khởi tạo kết nối Firestore' };
    }

    // Student data & class rosters are strictly managed by user imports from teachers (no mock seeding)




    // 4. Check and seed 'elearning_lessons'
    const lessonsSnap = await getDocs(collection(db, 'elearning_lessons'));
    if (lessonsSnap.empty) {
      const batch = trackedWriteBatch(db);
      for (const lesson of INITIAL_LESSONS) {
        const ref = doc(db, 'elearning_lessons', lesson.id);
        batch.set(ref, lesson);
      }
      await batch.commit();
    }

    // Questions are managed by admin/teachers and not auto-seeded on startup

    return {
      success: true,
      message: 'Khởi tạo và đồng bộ toàn diện các collection Firestore thành công!'
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('resource-exhausted') || msg.includes('quota') || err?.code === 'resource-exhausted') {
      console.warn('Firebase resource-exhausted / quota exceeded. Continuing with local cache fallback.');
    } else {
      console.warn('Lỗi khởi tạo và đồng bộ Firestore:', err);
    }
    return {
      success: false,
      message: msg
    };
  }
}

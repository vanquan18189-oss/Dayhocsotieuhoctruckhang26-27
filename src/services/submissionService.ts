import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { AssignmentSubmission } from '../types';

export const ASSIGNMENT_SUBMISSIONS_COLLECTION = 'assignment_submissions';
export const EXAM_SUBMISSIONS_COLLECTION = 'exam_submissions';

/**
 * Save a single assignment submission as a dedicated document in both subcollection and global collection
 */
export async function saveAssignmentSubmission(
  assignmentId: string,
  submission: AssignmentSubmission
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const studentKey = String(
    submission.studentId || (submission as any).sddcn || (submission as any).maHs || (submission as any).studentCode || 'student'
  ).trim().toLowerCase();

  const payload = {
    ...submission,
    assignmentId,
    studentId: studentKey,
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. Save to subcollection: assignments/{assignmentId}/submissions/{studentKey}
    const subRef = doc(db, 'assignments', assignmentId, 'submissions', studentKey);
    await setDoc(subRef, payload, { merge: true });

    // 2. Save to global collection: assignment_submissions/{assignmentId}_{studentKey}
    const globalSubRef = doc(db, ASSIGNMENT_SUBMISSIONS_COLLECTION, `${assignmentId}_${studentKey}`);
    await setDoc(globalSubRef, payload, { merge: true });

    // 3. Dispatch local event for instant UI update
    window.dispatchEvent(new CustomEvent('eduplay_student_submissions_updated', {
      detail: { assignmentId, studentId: studentKey }
    }));
  } catch (error) {
    console.error('Lỗi khi lưu bài nộp bài tập:', error);
    throw error;
  }
}

/**
 * Subscribe to all submissions for a specific assignment
 */
export function subscribeSubmissions(
  assignmentId: string,
  onUpdate: (submissions: AssignmentSubmission[]) => void
) {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'assignments', assignmentId, 'submissions');
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const subs: AssignmentSubmission[] = [];
      snapshot.forEach((docSnap) => {
        subs.push(docSnap.data() as AssignmentSubmission);
      });
      onUpdate(subs);
    },
    (err) => {
      console.warn(`Error subscribing to assignment submissions for ${assignmentId}:`, err);
      onUpdate([]);
    }
  );
}

/**
 * Subscribe in real time to ALL assignment submissions across all assignments
 */
export function subscribeAllAssignmentSubmissions(
  onUpdate: (submissionsMap: Map<string, Set<string>>) => void
) {
  if (!db) {
    onUpdate(new Map());
    return () => {};
  }

  try {
    const colRef = collection(db, ASSIGNMENT_SUBMISSIONS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const map = new Map<string, Set<string>>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const asId = String(data.assignmentId || data.targetId || '').trim().toLowerCase();
          const studentKey = String(data.sddcn || data.studentId || data.maHs || data.studentCode || data.studentName || docSnap.id).trim().toLowerCase();
          if (asId && studentKey) {
            if (!map.has(asId)) map.set(asId, new Set());
            map.get(asId)!.add(studentKey);
          }
        });
        onUpdate(map);
      },
      (err) => {
        console.warn('Error subscribing to all assignment submissions:', err);
        onUpdate(new Map());
      }
    );
  } catch (err) {
    console.warn('Cannot attach onSnapshot to assignment_submissions:', err);
    onUpdate(new Map());
    return () => {};
  }
}

/**
 * Subscribe in real time to ALL exam submissions across all exams
 */
export function subscribeAllExamSubmissions(
  onUpdate: (submissionsMap: Map<string, Set<string>>) => void
) {
  if (!db) {
    onUpdate(new Map());
    return () => {};
  }

  try {
    const colRef = collection(db, EXAM_SUBMISSIONS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const map = new Map<string, Set<string>>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const examId = String(data.examId || data.targetExamId || data.targetId || '').trim().toLowerCase();
          const studentKey = String(data.sddcn || data.studentId || data.maHs || data.studentCode || data.studentName || docSnap.id).trim().toLowerCase();
          if (examId && studentKey) {
            if (!map.has(examId)) map.set(examId, new Set());
            map.get(examId)!.add(studentKey);
          }
        });
        onUpdate(map);
      },
      (err) => {
        console.warn('Error subscribing to all exam submissions:', err);
        onUpdate(new Map());
      }
    );
  } catch (err) {
    console.warn('Cannot attach onSnapshot to exam_submissions:', err);
    onUpdate(new Map());
    return () => {};
  }
}

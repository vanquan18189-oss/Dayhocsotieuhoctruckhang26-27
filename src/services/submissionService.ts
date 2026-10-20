import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { AssignmentSubmission } from '../types';

const SUBMISSIONS_COLLECTION = 'assignment_submissions';

/**
 * Save a single submission as a dedicated document:
 * assignments/{assignmentId}/submissions/{studentId}
 */
export async function saveAssignmentSubmission(
  assignmentId: string,
  submission: AssignmentSubmission
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const subRef = doc(db, 'assignments', assignmentId, 'submissions', submission.studentId);
  
  try {
    await setDoc(subRef, {
      ...submission,
      assignmentId,
      updatedAt: Date.now()
    }, { merge: true });
    
    // Dispatch local event for instant UI update
    window.dispatchEvent(new CustomEvent('eduplay_student_submissions_updated', {
      detail: { assignmentId, studentId: submission.studentId }
    }));
  } catch (error) {
    console.error('Lỗi khi lưu bài nộp:', error);
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
  
  return onSnapshot(colRef, (snapshot) => {
    const subs: AssignmentSubmission[] = [];
    snapshot.forEach((docSnap) => {
      subs.push(docSnap.data() as AssignmentSubmission);
    });
    onUpdate(subs);
  });
}

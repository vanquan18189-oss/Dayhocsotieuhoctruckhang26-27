import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, getDoc, getDocs } from 'firebase/firestore';
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

    // 3. Save to global exam_submissions collection as well so both dashboards see it
    const globalExamSubRef = doc(db, EXAM_SUBMISSIONS_COLLECTION, `${assignmentId}_${studentKey}`);
    await setDoc(globalExamSubRef, payload, { merge: true });

    // 4. Update parent assignment doc so onSnapshot listeners update immediately
    try {
      const assignDocRef = doc(db, 'assignments', assignmentId);
      const assignSnap = await getDoc(assignDocRef);
      if (assignSnap.exists()) {
        const curData = assignSnap.data();
        const existingSubs: any[] = Array.isArray(curData.submissions) ? [...curData.submissions] : [];
        const filtered = existingSubs.filter((s: any) => 
          (s.sddcn || s.studentId || s.maHs || '').toString().toLowerCase() !== studentKey
        );
        filtered.unshift(payload);
        const uniqueKeys = new Set(filtered.map((s: any) => (s.sddcn || s.studentId || s.maHs || '').toString().trim().toLowerCase()).filter(Boolean));
        await setDoc(assignDocRef, {
          submissions: filtered,
          submittedCount: uniqueKeys.size,
          completedCount: uniqueKeys.size,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Note: Master assignment document update optional:', e);
    }

    // 5. Dispatch local events for instant UI update
    window.dispatchEvent(new CustomEvent('eduplay_student_submissions_updated', {
      detail: { assignmentId, studentId: studentKey }
    }));
    window.dispatchEvent(new Event('eduplay_exam_submissions_updated'));
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
 * Subscribe in real time to all submissions for a specific exam or test
 */
export function subscribeExamSubmissions(
  examId: string | number,
  onUpdate: (submissions: any[]) => void,
  classId?: string | number
) {
  if (!db || examId === undefined || examId === null) {
    onUpdate([]);
    return () => {};
  }

  const cleanExamId = String(examId).trim();
  const lowerExamId = cleanExamId.toLowerCase();
  const rootExamId = lowerExamId.replace(/-class-.*$/, '');
  const cleanClassId = classId ? String(classId).trim().toLowerCase().replace(/^lớp\s*/i, '') : '';
  const submissionsMap = new Map<string, any>();

  const emit = () => {
    onUpdate(Array.from(submissionsMap.values()));
  };

  const isClassMatch = (data: any): boolean => {
    if (!cleanClassId) return true;
    const docClass = String(data.classId || data.studentClass || data.className || data.targetClass || data.lop || '').trim().toLowerCase().replace(/^lớp\s*/i, '');
    if (!docClass) return true;
    return docClass === cleanClassId;
  };

  const processDoc = (docSnap: any) => {
    const data = docSnap.data();
    if (!data) return;
    
    // Type-safe matching for testId/examId across string and number formats
    const rawTestId = data.testId ?? data.examId ?? data.assignmentId ?? data.targetId ?? data.targetExamId;
    const itemExamId = String(rawTestId || '').trim().toLowerCase();
    const itemRootId = itemExamId.replace(/-class-.*$/, '');

    const isMatch = Boolean(
      (itemExamId && (itemExamId === lowerExamId || itemExamId === cleanExamId || itemRootId === rootExamId)) ||
      (rawTestId !== undefined && String(rawTestId) === cleanExamId) ||
      (typeof examId === 'number' && Number(rawTestId) === examId) ||
      docSnap.id.toLowerCase().startsWith(`${lowerExamId}_`) ||
      docSnap.id.toLowerCase().startsWith(`${rootExamId}_`)
    );

    if (!isMatch && itemExamId) {
      return;
    }

    if (!isClassMatch(data)) {
      return;
    }

    const studentKey = String(
      data.sddcn || data.studentPersistentId || data.studentId || data.maHs || data.studentCode || data.code || docSnap.id || ''
    ).trim().toLowerCase();

    if (studentKey) {
      submissionsMap.set(studentKey, {
        id: docSnap.id,
        ...data
      });
    }
  };

  const unsubs: Array<() => void> = [];

  try {
    const examSubCol = collection(db, 'exams', cleanExamId, 'submissions');
    unsubs.push(onSnapshot(examSubCol, (snap) => {
      snap.forEach(processDoc);
      emit();
    }, (err) => console.warn('Note: exams subcollection onSnapshot:', err)));
  } catch {}

  if (rootExamId && rootExamId !== lowerExamId) {
    try {
      const rootSubCol = collection(db, 'exams', rootExamId, 'submissions');
      unsubs.push(onSnapshot(rootSubCol, (snap) => {
        snap.forEach(processDoc);
        emit();
      }, (err) => console.warn('Note: root exam subcollection onSnapshot:', err)));
    } catch {}
  }

  try {
    const assignSubCol = collection(db, 'assignments', cleanExamId, 'submissions');
    unsubs.push(onSnapshot(assignSubCol, (snap) => {
      snap.forEach(processDoc);
      emit();
    }, (err) => console.warn('Note: assignments subcollection onSnapshot:', err)));
  } catch {}

  try {
    const globalCol = collection(db, EXAM_SUBMISSIONS_COLLECTION);
    unsubs.push(onSnapshot(globalCol, (snap) => {
      snap.forEach(processDoc);
      emit();
    }, (err) => console.warn('Note: global exam_submissions onSnapshot:', err)));
  } catch {}

  return () => {
    unsubs.forEach(unsub => {
      try { unsub(); } catch {}
    });
  };
}

/**
 * Query submissions by testId/examId and optional classId from Firestore with type-safe comparison (string & number)
 */
export async function querySubmissionsByExamAndClass(
  testId: string | number,
  classId?: string | number
): Promise<any[]> {
  if (!db || testId === undefined || testId === null) return [];

  const cleanTestId = String(testId).trim();
  const lowerTestId = cleanTestId.toLowerCase();
  const rootTestId = lowerTestId.replace(/-class-.*$/, '');
  const cleanClassId = classId !== undefined && classId !== null ? String(classId).trim().toLowerCase().replace(/^lớp\s*/i, '') : '';

  const results: any[] = [];
  const seenStudents = new Set<string>();

  const processDocData = (data: any, docId: string) => {
    if (!data) return;
    
    // Type-safe testId / examId comparison (string / number / rootId)
    const rawTestId = data.testId ?? data.examId ?? data.assignmentId ?? data.targetId ?? data.targetExamId;
    const docTestId = String(rawTestId || '').trim().toLowerCase();
    const docRootId = docTestId.replace(/-class-.*$/, '');

    const isTestMatch = (
      docTestId === lowerTestId || 
      docTestId === cleanTestId ||
      docRootId === rootTestId ||
      (rawTestId !== undefined && String(rawTestId) === cleanTestId) ||
      (typeof testId === 'number' && Number(rawTestId) === testId) ||
      docId.toLowerCase().startsWith(`${lowerTestId}_`) ||
      docId.toLowerCase().startsWith(`${rootTestId}_`)
    );
    
    if (!isTestMatch) return;

    if (cleanClassId) {
      const docClass = String(data.classId || data.studentClass || data.className || data.targetClass || data.lop || '').trim().toLowerCase().replace(/^lớp\s*/i, '');
      if (docClass && docClass !== cleanClassId) {
        return;
      }
    }

    const studentKey = String(data.sddcn || data.studentPersistentId || data.studentId || data.maHs || data.studentCode || data.code || docId).trim().toLowerCase();
    if (studentKey && !seenStudents.has(studentKey)) {
      seenStudents.add(studentKey);
      results.push({ id: docId, ...data });
    }
  };

  try {
    const subCol = collection(db, 'exams', cleanTestId, 'submissions');
    const snap = await getDocs(subCol);
    snap.forEach(d => processDocData(d.data(), d.id));
  } catch {}

  if (rootTestId && rootTestId !== lowerTestId) {
    try {
      const rootCol = collection(db, 'exams', rootTestId, 'submissions');
      const snap = await getDocs(rootCol);
      snap.forEach(d => processDocData(d.data(), d.id));
    } catch {}
  }

  try {
    const assignCol = collection(db, 'assignments', cleanTestId, 'submissions');
    const snap = await getDocs(assignCol);
    snap.forEach(d => processDocData(d.data(), d.id));
  } catch {}

  try {
    const globalCol = collection(db, EXAM_SUBMISSIONS_COLLECTION);
    const snap = await getDocs(globalCol);
    snap.forEach(d => processDocData(d.data(), d.id));
  } catch {}

  try {
    const globalAssignCol = collection(db, ASSIGNMENT_SUBMISSIONS_COLLECTION);
    const snap = await getDocs(globalAssignCol);
    snap.forEach(d => processDocData(d.data(), d.id));
  } catch {}

  return results;
}

/**
 * Helper to process snapshot documents into a submissions map (targetId -> Set<studentKey>)
 */
function processSubmissionsSnapshot(snapshot: any): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const addMapping = (targetId: string, studentKey: string) => {
    if (!targetId || !studentKey) return;
    const cleanId = targetId.trim();
    const lowerId = cleanId.toLowerCase();
    const rootId = lowerId.replace(/-class-.*$/, '');
    const cleanStudent = studentKey.trim().toLowerCase();

    const idsToMap = [cleanId, lowerId, rootId].filter(Boolean);
    idsToMap.forEach(id => {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id)!.add(cleanStudent);
    });
  };

  snapshot.forEach((docSnap: any) => {
    const data = docSnap.data() || {};
    const rawTargetId = data.testId ?? data.assignmentId ?? data.examId ?? data.homeworkId ?? data.targetId ?? data.targetExamId;
    let targetId = String(rawTargetId || '').trim();
    
    // Fallback if targetId missing: parse from docSnap.id if formatted as `${id}_${studentKey}`
    if (!targetId && docSnap.id && docSnap.id.includes('_')) {
      const parts = docSnap.id.split('_');
      if (parts.length >= 2) {
        targetId = parts[0];
      }
    }

    let studentKey = String(
      data.sddcn || data.studentId || data.studentPersistentId || data.maHs || data.studentCode || data.code || data.studentName || ''
    ).trim();

    if (!studentKey && docSnap.id && docSnap.id.includes('_')) {
      const parts = docSnap.id.split('_');
      if (parts.length >= 2) {
        studentKey = parts.slice(1).join('_');
      }
    }

    if (!studentKey) {
      studentKey = docSnap.id;
    }

    if (targetId && studentKey) {
      addMapping(targetId, studentKey);
    }
  });

  return map;
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
        const map = processSubmissionsSnapshot(snapshot);
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
        const map = processSubmissionsSnapshot(snapshot);
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

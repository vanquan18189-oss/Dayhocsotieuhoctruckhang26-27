import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, getDoc, getDocs } from 'firebase/firestore';
import { AssignmentSubmission, ExamPaper, HomeworkAssignment } from '../types';
import { trackedSetDoc } from './firestoreWriteTracker';
import { getStudentsFromLocalStorage } from './studentStorageService';

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

  const processDoc = (docSnap: any, fromSubcollection: boolean = false) => {
    const data = docSnap.data();
    if (!data) return;
    
    // Type-safe matching for testId/examId across string and number formats
    const rawTestId = data.testId ?? data.examId ?? data.assignmentId ?? data.targetId ?? data.targetExamId;
    const itemExamId = String(rawTestId || '').trim().toLowerCase();
    const itemRootId = itemExamId.replace(/-class-.*$/, '');

    const isMatch = Boolean(
      fromSubcollection ||
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
      snap.forEach(d => processDoc(d, true));
      emit();
    }, (err) => console.warn('Note: exams subcollection onSnapshot:', err)));
  } catch {}

  if (rootExamId && rootExamId !== lowerExamId) {
    try {
      const rootSubCol = collection(db, 'exams', rootExamId, 'submissions');
      unsubs.push(onSnapshot(rootSubCol, (snap) => {
        snap.forEach(d => processDoc(d, true));
        emit();
      }, (err) => console.warn('Note: root exam subcollection onSnapshot:', err)));
    } catch {}
  }

  try {
    const assignSubCol = collection(db, 'assignments', cleanExamId, 'submissions');
    unsubs.push(onSnapshot(assignSubCol, (snap) => {
      snap.forEach(d => processDoc(d, true));
      emit();
    }, (err) => console.warn('Note: assignments subcollection onSnapshot:', err)));
  } catch {}

  if (rootExamId && rootExamId !== lowerExamId) {
    try {
      const rootAssignSubCol = collection(db, 'assignments', rootExamId, 'submissions');
      unsubs.push(onSnapshot(rootAssignSubCol, (snap) => {
        snap.forEach(d => processDoc(d, true));
        emit();
      }, (err) => console.warn('Note: root assignments subcollection onSnapshot:', err)));
    } catch {}
  }

  try {
    const globalCol = collection(db, EXAM_SUBMISSIONS_COLLECTION);
    unsubs.push(onSnapshot(globalCol, (snap) => {
      snap.forEach(d => processDoc(d, false));
      emit();
    }, (err) => console.warn('Note: global exam_submissions onSnapshot:', err)));
  } catch {}

  try {
    const globalAssignCol = collection(db, ASSIGNMENT_SUBMISSIONS_COLLECTION);
    unsubs.push(onSnapshot(globalAssignCol, (snap) => {
      snap.forEach(d => processDoc(d, false));
      emit();
    }, (err) => console.warn('Note: global assignment_submissions onSnapshot:', err)));
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

/**
 * Đồng bộ số lượng bài nộp cho một Đề kiểm tra trực tiếp từ Firestore subcollections
 * Tự động cập nhật `submissionsCount`, `completedCount`, `submittedCount` trên tài liệu đề nếu có sự chênh lệch.
 */
export async function syncExamSubmissionsCount(exam: ExamPaper): Promise<number> {
  if (!db || !exam?.id) return typeof exam?.submissionsCount === 'number' ? exam.submissionsCount : 0;

  try {
    const cleanId = String(exam.id).trim();
    const lowerId = cleanId.toLowerCase();
    const rootId = lowerId.replace(/-class-.*$/, '');
    const origId = exam.originalExamId ? String(exam.originalExamId).trim().toLowerCase() : '';
    const targetCls = exam.targetClass || '';
    const normCls = targetCls.trim().toLowerCase().replace(/^lớp\s*/i, '');

    const roster = getStudentsFromLocalStorage(targetCls) || [];
    const rosterKeys = new Set<string>();
    roster.forEach((st: any) => {
      [st.sddcn, st.code, st.id, st.name, st.fullName].forEach(k => {
        if (k) rosterKeys.add(String(k).trim().toLowerCase());
      });
    });

    const uniqueStudents = new Set<string>();

    const checkAndAdd = (data: any, docId: string, fromSubCol: boolean = false) => {
      if (!data) return;
      const rawTestId = data.testId ?? data.examId ?? data.assignmentId ?? data.targetId ?? data.targetExamId;
      const itemExamId = String(rawTestId || '').trim().toLowerCase();
      const itemRootId = itemExamId.replace(/-class-.*$/, '');

      const isMatch = Boolean(
        fromSubCol ||
        (itemExamId && (itemExamId === lowerId || itemExamId === cleanId || itemRootId === rootId || (origId && itemExamId === origId))) ||
        (rawTestId !== undefined && String(rawTestId) === cleanId) ||
        docId.toLowerCase().startsWith(`${lowerId}_`) ||
        docId.toLowerCase().startsWith(`${rootId}_`)
      );
      if (!isMatch && itemExamId) return;

      const subCls = String(data.classId || data.studentClass || data.className || data.targetClass || data.lop || '').trim().toLowerCase().replace(/^lớp\s*/i, '');
      const studentKey = String(data.sddcn || data.studentPersistentId || data.studentId || data.maHs || data.studentCode || data.code || docId).trim().toLowerCase();
      const studentName = String(data.studentName || data.name || data.fullName || '').trim().toLowerCase();

      if (normCls) {
        const isClassEqual = subCls && subCls === normCls;
        const isInRoster = rosterKeys.has(studentKey) || (studentName && rosterKeys.has(studentName));
        if (subCls && !isClassEqual && !isInRoster) {
          return;
        }
      }

      if (studentKey) {
        uniqueStudents.add(studentKey);
      }
    };

    // 1. Query exams/{cleanId}/submissions
    try {
      const snap = await getDocs(collection(db, 'exams', cleanId, 'submissions'));
      snap.forEach(d => checkAndAdd(d.data(), d.id, true));
    } catch {}

    // 2. Query exams/{rootId}/submissions
    if (rootId && rootId !== lowerId) {
      try {
        const snap = await getDocs(collection(db, 'exams', rootId, 'submissions'));
        snap.forEach(d => checkAndAdd(d.data(), d.id, true));
      } catch {}
    }

    // 3. Query assignments/{cleanId}/submissions
    try {
      const snap = await getDocs(collection(db, 'assignments', cleanId, 'submissions'));
      snap.forEach(d => checkAndAdd(d.data(), d.id, true));
    } catch {}

    // 4. Check array exam.submissions
    if (Array.isArray(exam.submissions)) {
      exam.submissions.forEach((s: any) => checkAndAdd(s, s.id || '', false));
    }

    // 5. Check LocalStorage submissions
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`eduplay_exam_subs_${exam.id}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) list.forEach((s: any) => checkAndAdd(s, s.id || '', false));
        }
      } catch {}
    }

    const explicit = Math.max(
      typeof exam.submissionsCount === 'number' ? exam.submissionsCount : 0,
      typeof (exam as any).completedCount === 'number' ? (exam as any).completedCount : 0,
      typeof (exam as any).submittedCount === 'number' ? (exam as any).submittedCount : 0
    );

    const calculated = Math.max(uniqueStudents.size, explicit);

    // If calculated differs from exam.submissionsCount, write back to Firestore doc
    if (calculated > 0 && exam.submissionsCount !== calculated) {
      try {
        const examRef = doc(db, 'exams', exam.id);
        await trackedSetDoc(examRef, {
          submissionsCount: calculated,
          completedCount: calculated,
          submittedCount: calculated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        exam.submissionsCount = calculated;
        (exam as any).completedCount = calculated;
        (exam as any).submittedCount = calculated;
      } catch (err) {
        console.warn(`Lỗi cập nhật submissionsCount cho exam ${exam.id}:`, err);
      }
    }

    return calculated;
  } catch (e) {
    console.warn(`Lỗi syncExamSubmissionsCount cho đề ${exam.id}:`, e);
    return typeof exam.submissionsCount === 'number' ? exam.submissionsCount : 0;
  }
}

/**
 * Đồng bộ toàn bộ danh sách Đề kiểm tra
 */
export async function syncAllExamsSubmissionsCounts(exams: ExamPaper[]): Promise<Map<string, number>> {
  const resMap = new Map<string, number>();
  if (!Array.isArray(exams) || exams.length === 0) return resMap;

  await Promise.allSettled(
    exams.map(async (exam) => {
      const count = await syncExamSubmissionsCount(exam);
      resMap.set(exam.id, count);
    })
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('eduplay_exam_submissions_updated'));
  }

  return resMap;
}

/**
 * Đồng bộ số lượng bài nộp cho một Bài tập trực tiếp từ Firestore subcollections
 * Tự động cập nhật `completedCount`, `submittedCount`, `submissionsCount` trên tài liệu bài tập nếu có sự chênh lệch.
 */
export async function syncAssignmentSubmissionsCount(as: HomeworkAssignment): Promise<number> {
  if (!db || !as?.id) return typeof as?.completedCount === 'number' ? as.completedCount : 0;

  try {
    const cleanId = String(as.id).trim();
    const lowerId = cleanId.toLowerCase();
    const rootId = lowerId.replace(/-class-.*$/, '');
    const origId = (as as any).originalAssignmentId ? String((as as any).originalAssignmentId).trim().toLowerCase() : '';
    const targetCls = as.targetClass || '';
    const normCls = targetCls.trim().toLowerCase().replace(/^lớp\s*/i, '');

    const roster = getStudentsFromLocalStorage(targetCls) || [];
    const rosterKeys = new Set<string>();
    roster.forEach((st: any) => {
      [st.sddcn, st.code, st.id, st.name, st.fullName].forEach(k => {
        if (k) rosterKeys.add(String(k).trim().toLowerCase());
      });
    });

    const uniqueStudents = new Set<string>();

    const checkAndAdd = (data: any, docId: string, fromSubCol: boolean = false) => {
      if (!data) return;
      const rawTestId = data.testId ?? data.examId ?? data.assignmentId ?? data.targetId ?? data.targetExamId;
      const itemExamId = String(rawTestId || '').trim().toLowerCase();
      const itemRootId = itemExamId.replace(/-class-.*$/, '');

      const isMatch = Boolean(
        fromSubCol ||
        (itemExamId && (itemExamId === lowerId || itemExamId === cleanId || itemRootId === rootId || (origId && itemExamId === origId))) ||
        (rawTestId !== undefined && String(rawTestId) === cleanId) ||
        docId.toLowerCase().startsWith(`${lowerId}_`) ||
        docId.toLowerCase().startsWith(`${rootId}_`)
      );
      if (!isMatch && itemExamId) return;

      const subCls = String(data.classId || data.studentClass || data.className || data.targetClass || data.lop || '').trim().toLowerCase().replace(/^lớp\s*/i, '');
      const studentKey = String(data.sddcn || data.studentPersistentId || data.studentId || data.maHs || data.studentCode || data.code || docId).trim().toLowerCase();
      const studentName = String(data.studentName || data.name || data.fullName || '').trim().toLowerCase();

      if (normCls) {
        const isClassEqual = subCls && subCls === normCls;
        const isInRoster = rosterKeys.has(studentKey) || (studentName && rosterKeys.has(studentName));
        if (subCls && !isClassEqual && !isInRoster) {
          return;
        }
      }

      if (studentKey) {
        uniqueStudents.add(studentKey);
      }
    };

    // 1. Query assignments/{cleanId}/submissions
    try {
      const snap = await getDocs(collection(db, 'assignments', cleanId, 'submissions'));
      snap.forEach(d => checkAndAdd(d.data(), d.id, true));
    } catch {}

    // 2. Query assignments/{rootId}/submissions
    if (rootId && rootId !== lowerId) {
      try {
        const snap = await getDocs(collection(db, 'assignments', rootId, 'submissions'));
        snap.forEach(d => checkAndAdd(d.data(), d.id, true));
      } catch {}
    }

    // 3. Query exams/{cleanId}/submissions
    try {
      const snap = await getDocs(collection(db, 'exams', cleanId, 'submissions'));
      snap.forEach(d => checkAndAdd(d.data(), d.id, true));
    } catch {}

    // 4. Check array as.submissions
    if (Array.isArray(as.submissions)) {
      as.submissions.forEach((s: any) => checkAndAdd(s, s.id || '', false));
    }

    const explicit = Math.max(
      typeof as.completedCount === 'number' ? as.completedCount : 0,
      typeof as.submittedCount === 'number' ? as.submittedCount : 0,
      typeof (as as any).submissionsCount === 'number' ? (as as any).submissionsCount : 0
    );

    const calculated = Math.max(uniqueStudents.size, explicit);

    if (calculated > 0 && as.completedCount !== calculated) {
      try {
        const asRef = doc(db, 'assignments', as.id);
        await trackedSetDoc(asRef, {
          completedCount: calculated,
          submittedCount: calculated,
          submissionsCount: calculated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        as.completedCount = calculated;
        as.submittedCount = calculated;
        (as as any).submissionsCount = calculated;
      } catch (err) {
        console.warn(`Lỗi cập nhật completedCount cho assignment ${as.id}:`, err);
      }
    }

    return calculated;
  } catch (e) {
    console.warn(`Lỗi syncAssignmentSubmissionsCount cho bài tập ${as.id}:`, e);
    return typeof as.completedCount === 'number' ? as.completedCount : 0;
  }
}

/**
 * Đồng bộ toàn bộ danh sách Bài tập
 */
export async function syncAllAssignmentsSubmissionsCounts(assignments: HomeworkAssignment[]): Promise<Map<string, number>> {
  const resMap = new Map<string, number>();
  if (!Array.isArray(assignments) || assignments.length === 0) return resMap;

  await Promise.allSettled(
    assignments.map(async (as) => {
      const count = await syncAssignmentSubmissionsCount(as);
      resMap.set(as.id, count);
    })
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
  }

  return resMap;
}

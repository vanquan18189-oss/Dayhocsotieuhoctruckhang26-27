import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertOctagon,
  RefreshCw,
  X,
  Minimize2,
  Maximize2,
  ShieldAlert,
  Database,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Users
} from 'lucide-react';
import {
  getFirestoreWriteStats,
  resetFirestoreWriteStats,
  FirestoreWriteStatsSummary,
  BlockedMetricItem
} from '../services/firestoreWriteTracker';
import { db, firebaseConfig, reconnectFirebase } from '../firebaseConfig';
import { collection, getDocs, getDocsFromServer } from 'firebase/firestore';
import { getLocalCachedQuestions } from '../services/questionStorageService';

interface ExamSubmissionDiag {
  id: string;
  title: string;
  targetClass: string;
  realSubmissionsCount: number; // actual documents in exams/{id}/submissions
  tableDisplayCount: number; // submissionsCount stored on the exam doc
  isMatch: boolean;
}

interface ClassRosterEnrollmentDiag {
  classId: string;
  className: string;
  rosterCount: number;
  enrollmentCount: number;
  diff: number;
  isMatch: boolean;
}

export const FirestoreDebugOverlay: React.FC = () => {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [stats, setStats] = useState<FirestoreWriteStatsSummary>(getFirestoreWriteStats());
  const [rateLimitWarning, setRateLimitWarning] = useState<BlockedMetricItem | null>(null);

  const [questionDiag, setQuestionDiag] = useState<{
    firestoreCount: number;
    uiCount: number;
    serverCount: number;
    cacheCount: number;
    mockCount: number;
  }>({ firestoreCount: 0, uiCount: 0, serverCount: 0, cacheCount: 0, mockCount: 0 });

  const [examDiags, setExamDiags] = useState<ExamSubmissionDiag[]>([]);
  const [classDiags, setClassDiags] = useState<ClassRosterEnrollmentDiag[]>([]);
  const [isLoadingDiags, setIsLoadingDiags] = useState<boolean>(false);

  useEffect(() => {
    if (!isDebugMode) return;

    const checkAllDiagnostics = async () => {
      setIsLoadingDiags(true);
      try {
        // 1. Question Diag
        const cached = getLocalCachedQuestions();
        const uiCount = cached ? cached.length : 0;
        let firestoreCount = 0;
        let isServer = false;

        if (db) {
          try {
            const snap = await getDocsFromServer(collection(db, 'questions'));
            firestoreCount = snap.size;
            isServer = true;
          } catch {
            const snap = await getDocs(collection(db, 'questions'));
            firestoreCount = snap.size;
          }
        }

        const mockCount = cached ? cached.filter(q => (q.code && q.code.includes('CH-CN3')) || (q.id && (q.id.startsWith('m-') || q.id.startsWith('q-')))).length : 0;

        setQuestionDiag({
          firestoreCount,
          uiCount,
          serverCount: isServer ? firestoreCount : 0,
          cacheCount: isServer ? Math.max(0, uiCount - firestoreCount) : uiCount,
          mockCount
        });

        // 2. Exam Submissions Comparison (?debug=1 requirement)
        if (db) {
          try {
            const examsSnap = await getDocs(collection(db, 'exams'));
            const examResults: ExamSubmissionDiag[] = [];
            for (const ed of examsSnap.docs) {
              const edData = ed.data();
              let realSubCount = 0;
              try {
                const subsSnap = await getDocs(collection(db, 'exams', ed.id, 'submissions'));
                realSubCount = subsSnap.size;
              } catch {}
              const tableCount = typeof edData.submissionsCount === 'number'
                ? edData.submissionsCount
                : (Array.isArray(edData.submissions) ? edData.submissions.length : 0);

              examResults.push({
                id: ed.id,
                title: edData.title || '(Chưa đặt tên)',
                targetClass: edData.targetClass || 'Chưa giao',
                realSubmissionsCount: realSubCount,
                tableDisplayCount: tableCount,
                isMatch: realSubCount === tableCount
              });
            }
            setExamDiags(examResults);
          } catch (e) {
            console.warn('Exam diagnostic error in debug overlay:', e);
          }

          // 3. Class Rosters vs Student Enrollments comparison
          try {
            const rosterSnap = await getDocs(collection(db, 'class_rosters'));
            const rosterMap: Record<string, { className: string; count: number }> = {};
            rosterSnap.forEach((rd) => {
              const rData = rd.data();
              const cName = rData.className || rd.id;
              const count = Array.isArray(rData.students) ? rData.students.length : (typeof rData.totalStudents === 'number' ? rData.totalStudents : 0);
              const key = cName.trim().toUpperCase().replace(/^LỚP\s*/i, '');
              rosterMap[key] = { className: cName, count };
            });

            const enrollSnap = await getDocs(collection(db, 'student_enrollments'));
            const enrollMap: Record<string, number> = {};
            enrollSnap.forEach((end) => {
              const eData = end.data();
              const rawClass = eData.classId || eData.className || '';
              const key = rawClass.trim().toUpperCase().replace(/^LỚP\s*/i, '');
              if (key) {
                enrollMap[key] = (enrollMap[key] || 0) + 1;
              }
            });

            const allClasses = Array.from(new Set([...Object.keys(rosterMap), ...Object.keys(enrollMap)])).sort();
            const classResults: ClassRosterEnrollmentDiag[] = allClasses.map((cls) => {
              const rCount = rosterMap[cls]?.count || 0;
              const eCount = enrollMap[cls] || 0;
              return {
                classId: cls,
                className: rosterMap[cls]?.className || `Lớp ${cls}`,
                rosterCount: rCount,
                enrollmentCount: eCount,
                diff: eCount - rCount,
                isMatch: rCount === eCount
              };
            });
            setClassDiags(classResults);
          } catch (e) {
            console.warn('Class roster diagnostic error in debug overlay:', e);
          }
        }
      } catch (err) {
        console.warn('Debug diagnostic error:', err);
      } finally {
        setIsLoadingDiags(false);
      }
    };

    checkAllDiagnostics();
    const interval = setInterval(checkAllDiagnostics, 6000);
    return () => clearInterval(interval);
  }, [isDebugMode]);

  useEffect(() => {
    // Check if ?debug=1 or debug=true in location search/hash
    const checkDebugFlag = () => {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (search.includes('debug=1') || search.includes('debug=true') || hash.includes('debug=1')) {
        setIsDebugMode(true);
      }
    };

    checkDebugFlag();

    const handleUpdate = () => {
      setStats(getFirestoreWriteStats());
    };

    const handleRateLimitTriggered = (e: any) => {
      if (e?.detail) {
        setRateLimitWarning(e.detail);
      }
    };

    window.addEventListener('eduplay_firestore_writes_updated', handleUpdate);
    window.addEventListener('eduplay_firestore_rate_limit_triggered', handleRateLimitTriggered);

    return () => {
      window.removeEventListener('eduplay_firestore_writes_updated', handleUpdate);
      window.removeEventListener('eduplay_firestore_rate_limit_triggered', handleRateLimitTriggered);
    };
  }, []);

  if (!isDebugMode && !rateLimitWarning) {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[999999] max-w-2xl w-full text-slate-800 font-sans pointer-events-auto">
      {/* 🚨 RATE LIMIT WARNING BANNER */}
      {rateLimitWarning && (
        <div className={`mb-3 p-4 text-white rounded-xl shadow-2xl border-2 flex items-start justify-between gap-3 animate-bounce ${
          rateLimitWarning.blocked ? 'bg-rose-600 border-rose-300' : 'bg-amber-500 border-amber-300'
        }`}>
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-yellow-200 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                {rateLimitWarning.blocked
                  ? '🛑 [GHI NỀN BỊ CHẶN] Cảnh Báo Tần Suất Cao!'
                  : '⚠️ [CẢNH BÁO THAO TÁC ADMIN] Tần Suất Ghi Lớn'}
              </h4>
              <p className="text-xs text-white/95 mt-1 leading-relaxed">
                Nơi gọi <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-yellow-200">{rateLimitWarning.caller}</code> ({
                  rateLimitWarning.isUserInitiated ? 'Thao tác Admin/User' : 'Tiến trình nền/Tự động'
                }) đã đạt <span className="font-bold text-yellow-200">{rateLimitWarning.rate} lượt ghi/phút</span> vào collection <span className="underline font-semibold">{rateLimitWarning.collection}</span>.
              </p>
              <p className="text-[11px] text-yellow-100 mt-1">
                {rateLimitWarning.blocked
                  ? '🛡️ Tự động ngắt lệnh ghi nền để bảo vệ Quota Firestore.'
                  : 'ℹ️ Hệ thống cho phép thực thi tiếp do là thao tác chủ động của Admin.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setRateLimitWarning(null)}
            className="p-1 hover:bg-black/20 rounded-lg text-white/80 hover:text-white cursor-pointer shrink-0 transition-colors"
            title="Đóng cảnh báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 📊 DEBUG METRICS TABLE (When ?debug=1) */}
      {isDebugMode && (
        <div className="bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden text-xs">
          {/* Header */}
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-white">Firestore Write Tracker (?debug=1)</span>
              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                Tổng: {stats.totalWrites} lượt ghi
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => resetFirestoreWriteStats()}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer text-[11px] font-medium"
                title="Đặt lại bộ đếm về 0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ đếm</span>
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                title={isMinimized ? 'Mở rộng' : 'Thu gọn'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsDebugMode(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                title="Đóng bảng đo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body content */}
          {!isMinimized && (
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <Database className="w-3 h-3 text-blue-400" />
                    <span>Tổng số lệnh ghi</span>
                  </div>
                  <div className="text-lg font-bold text-blue-300 font-mono mt-0.5">
                    {stats.totalWrites}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    <span>Collections</span>
                  </div>
                  <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">
                    {Object.keys(stats.byCollection).length}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-amber-400" />
                    <span>Lần bị ngắt (&gt;200/phút)</span>
                  </div>
                  <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                    {stats.blockedWritesCount}
                  </div>
                </div>
              </div>

              {/* Active Project ID & Security Info */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-semibold text-xs">Firebase Project ID:</span>
                  <span className="font-mono text-emerald-300 font-bold bg-slate-900/90 px-2.5 py-0.5 rounded border border-slate-700 text-xs">
                    {firebaseConfig.projectId || 'dayhocsotruckhangth26-27'}
                  </span>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                    Cấu hình dự phòng: Sẵn sàng
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await reconnectFirebase();
                      window.location.reload();
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Khởi tạo lại kết nối Firestore và tải lại dữ liệu"
                  >
                    <RefreshCw className="w-3 h-3" /> Kết nối lại
                  </button>
                  <span className="text-[10px] text-slate-400 italic">
                    (Khóa apiKey được bảo vệ an toàn - không in ra debug)
                  </span>
                </div>
              </div>

              {/* Exam Submissions Real Count vs Table Display Count Diag */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đối soát Đề thi: Submissions thật trong Firestore vs Bảng giáo viên</span>
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    {isLoadingDiags ? 'Đang kiểm tra...' : `${examDiags.length} đề thi`}
                  </span>
                </div>

                {examDiags.length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-2 bg-slate-900/40 rounded-lg text-center">
                    {isLoadingDiags ? 'Đang truy vấn dữ liệu đề...' : 'Không có đề kiểm tra nào trên Firestore.'}
                  </div>
                ) : (
                  <div className="bg-slate-900/60 rounded-xl overflow-hidden border border-slate-700/60 max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-400 text-[10px] uppercase border-b border-slate-700/60 sticky top-0 z-10">
                          <th className="py-1.5 px-2.5 font-semibold">Tên đề thi & Lớp</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Tài liệu thật (Firestore)</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Hiển thị (Bảng)</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {examDiags.map((ex) => (
                          <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-2.5 font-sans">
                              <div className="font-bold text-slate-200 line-clamp-1">{ex.title}</div>
                              <div className="text-[10px] text-slate-400">{ex.targetClass} • <span className="font-mono text-[9px] text-slate-500">{ex.id}</span></div>
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-emerald-400">
                              {ex.realSubmissionsCount}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-blue-400">
                              {ex.tableDisplayCount}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {ex.isMatch ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Khớp
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3" /> Lệch ({ex.realSubmissionsCount - ex.tableDisplayCount > 0 ? `+${ex.realSubmissionsCount - ex.tableDisplayCount}` : ex.realSubmissionsCount - ex.tableDisplayCount})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Student Rosters vs Enrollments Diag */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-indigo-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Đối soát Học sinh: class_rosters vs student_enrollments</span>
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    {classDiags.filter(c => !c.isMatch).length === 0
                      ? 'Tất cả lớp khớp'
                      : `Lệch ${classDiags.filter(c => !c.isMatch).length} lớp`}
                  </span>
                </div>

                {classDiags.length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-2 bg-slate-900/40 rounded-lg text-center">
                    {isLoadingDiags ? 'Đang đối soát danh sách lớp...' : 'Chưa có dữ liệu lớp trên Firestore.'}
                  </div>
                ) : (
                  <div className="bg-slate-900/60 rounded-xl overflow-hidden border border-slate-700/60 max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-400 text-[10px] uppercase border-b border-slate-700/60 sticky top-0 z-10">
                          <th className="py-1.5 px-2.5 font-semibold">Lớp</th>
                          <th className="py-1.5 px-2 font-semibold text-center">class_rosters</th>
                          <th className="py-1.5 px-2 font-semibold text-center">student_enrollments</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Chênh lệch</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {classDiags.map((c) => (
                          <tr key={c.classId} className={`hover:bg-slate-800/40 transition-colors ${!c.isMatch ? 'bg-amber-950/20' : ''}`}>
                            <td className="py-1.5 px-2.5 font-sans font-bold text-slate-200">
                              {c.className}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-emerald-400">
                              {c.rosterCount}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-purple-400">
                              {c.enrollmentCount}
                            </td>
                            <td className={`py-1.5 px-2 text-center font-bold ${c.diff === 0 ? 'text-slate-400' : c.diff > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {c.diff > 0 ? `+${c.diff}` : c.diff}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {c.isMatch ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Khớp
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3" /> Lệch {Math.abs(c.diff)} HS
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Question Bank Diagnostics Card */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chẩn đoán Ngân Hàng Câu Hỏi</span>
                  </h5>
                  <div className="text-[11px] font-mono">
                    <span className="text-slate-400">Firestore: </span>
                    <b className="text-emerald-300 font-extrabold">{questionDiag.firestoreCount} câu</b>
                    <span className="text-slate-500 mx-1.5">|</span>
                    <span className="text-slate-400">Giao diện (UI): </span>
                    <b className="text-blue-300 font-extrabold">{questionDiag.uiCount} câu</b>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-400 text-[10px]">Máy chủ (Server)</div>
                    <div className="text-emerald-300 font-bold mt-0.5">{questionDiag.serverCount} câu</div>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-400 text-[10px]">Bộ nhớ đệm (Cache)</div>
                    <div className="text-blue-300 font-bold mt-0.5">{questionDiag.cacheCount} câu</div>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-400 text-[10px]">Mẫu (Mock)</div>
                    <div className="text-amber-300 font-bold mt-0.5">{questionDiag.mockCount} câu</div>
                  </div>
                </div>
              </div>

              {/* By Collection Table */}
              <div>
                <h5 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. Thống kê số lượt ghi theo Collection</span>
                </h5>
                {Object.keys(stats.byCollection).length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-2 bg-slate-800/30 rounded-lg text-center">
                    Chưa ghi nhận lệnh ghi nào trong phiên làm việc này.
                  </div>
                ) : (
                  <div className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-400 text-[10px] uppercase border-b border-slate-700/60">
                          <th className="py-2 px-3 font-semibold">Collection Name</th>
                          <th className="py-2 px-3 font-semibold text-right">Số lượt ghi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 font-mono text-[11px]">
                        {Object.entries(stats.byCollection)
                          .sort((a, b) => b[1] - a[1])
                          .map(([coll, count]) => (
                            <tr key={coll} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-1.5 px-3 text-indigo-300 font-medium">{coll}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-400">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* By Caller Location (Stack Trace) Table */}
              <div>
                <h5 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Thống kê theo Nơi gọi (File & Dòng code)</span>
                </h5>
                {Object.keys(stats.byCaller).length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-2 bg-slate-800/30 rounded-lg text-center">
                    Chưa có ghi nhận vị trí gọi.
                  </div>
                ) : (
                  <div className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-400 text-[10px] uppercase border-b border-slate-700/60">
                          <th className="py-2 px-3 font-semibold">Caller Location (Nơi gọi)</th>
                          <th className="py-2 px-3 font-semibold text-right">Số lượt ghi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 font-mono text-[11px]">
                        {Object.entries(stats.byCaller)
                          .sort((a, b) => b[1] - a[1])
                          .map(([caller, count]) => (
                            <tr key={caller} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-1.5 px-3 text-amber-300 font-semibold">{caller}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-400">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Blocked Calls Details if any */}
              {stats.blockedDetails.length > 0 && (
                <div>
                  <h5 className="font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>3. Nhật ký lệnh ghi bị ngắt do vượt ngưỡng (&gt;200/phút)</span>
                  </h5>
                  <div className="bg-amber-950/30 rounded-xl border border-amber-500/30 p-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                    {stats.blockedDetails.map((b) => (
                      <div key={b.id} className="text-[11px] font-mono text-amber-200 flex justify-between border-b border-amber-900/40 pb-1">
                        <span>{b.caller} ({b.collection})</span>
                        <span className="font-bold text-amber-400">{b.rate} lượt/phút</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

import { getDocFromServer, doc, Firestore } from 'firebase/firestore';

export interface SaveOperationOptions {
  timeoutMs?: number;
}

/**
 * Tiện ích dùng chung (runSaveOperation) để bọc mọi thao tác lưu:
 * - Đặt trạng thái đang lưu (isSaving = true)
 * - Chặn bấm lưu hai lần khi đang lưu
 * - Chạy thao tác kèm timeout (mặc định 15 giây)
 * - Luôn tắt trạng thái đang lưu trong khối finally
 * - Xử lý lỗi chi tiết bằng tiếng Việt kèm mã lỗi Firestore
 * - Kiểm tra dữ liệu trên máy chủ qua getDocFromServer và kiểm tra pending writes
 */
export async function runSaveOperation<T>(
  operation: () => Promise<T>,
  isSaving: boolean,
  setIsSaving: (val: boolean) => void,
  options?: SaveOperationOptions
): Promise<T> {
  if (isSaving) {
    throw new Error('Đang thực hiện lưu, vui lòng chờ...');
  }

  setIsSaving(true);
  const timeoutMs = options?.timeoutMs || 15000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const err = new Error('Hết thời gian chờ (timeout) sau 15 giây.');
      (err as any).code = 'timeout';
      reject(err);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      operation(),
      timeoutPromise
    ]);
    return result;
  } catch (err: any) {
    console.error('❌ [runSaveOperation Error]:', err);
    const code = err?.code || '';
    const message = (err?.message || '').toLowerCase();
    
    let detailedMsg = '';
    if (code === 'resource-exhausted' || message.includes('resource-exhausted') || message.includes('quota')) {
      detailedMsg = 'Hết hạn mức ghi trong ngày (resource-exhausted). Vui lòng nâng cấp gói hoặc thử lại vào ngày mai.';
    } else if (code === 'permission-denied' || message.includes('permission-denied')) {
      detailedMsg = 'Không có quyền thực hiện thao tác này (permission-denied).';
    } else if (code === 'unavailable' || message.includes('unavailable') || message.includes('offline') || message.includes('network')) {
      detailedMsg = 'Mất kết nối hoặc mạng Firestore đang tắt (unavailable). Vui lòng kiểm tra lại kết nối mạng.';
    } else if (code === 'timeout' || message.includes('timeout') || message.includes('15 giây')) {
      detailedMsg = 'Hết thời gian chờ (timeout). Thao tác lưu không hoàn thành trong 15 giây.';
    } else if (message.includes('dữ liệu chưa được lưu lên máy chủ') || message.includes('hàng đợi cục bộ')) {
      detailedMsg = err.message;
    } else {
      detailedMsg = `Lỗi (${code || 'unknown'}): ${err?.message || String(err)}`;
    }

    const enhancedErr = new Error(detailedMsg);
    (enhancedErr as any).code = code || 'unknown';
    (enhancedErr as any).originalError = err;
    throw enhancedErr;
  } finally {
    setIsSaving(false);
  }
}

/**
 * Kiểm tra dữ liệu đã được ghi thực sự lên máy chủ bằng getDocFromServer
 */
export async function verifyServerDocWritten(db: Firestore, collectionName: string, docId: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, collectionName, docId);
    const serverSnap = await getDocFromServer(docRef);

    if (!serverSnap.exists()) {
      const err = new Error('Dữ liệu chưa được lưu lên máy chủ (không tìm thấy bản ghi trên server).');
      (err as any).code = 'not-found-on-server';
      throw err;
    }

    if (serverSnap.metadata && serverSnap.metadata.hasPendingWrites) {
      const err = new Error('Dữ liệu chưa được lưu lên máy chủ (đang nằm trong hàng đợi cục bộ).');
      (err as any).code = 'pending-writes';
      throw err;
    }
  } catch (err: any) {
    const code = err?.code || '';
    const message = (err?.message || '').toLowerCase();
    if (code === 'unavailable' || message.includes('offline') || message.includes('unavailable')) {
      const netErr = new Error('Mất kết nối hoặc mạng Firestore đang tắt (unavailable). Dữ liệu chưa được đồng bộ lên máy chủ.');
      (netErr as any).code = 'unavailable';
      throw netErr;
    }
    throw err;
  }
}

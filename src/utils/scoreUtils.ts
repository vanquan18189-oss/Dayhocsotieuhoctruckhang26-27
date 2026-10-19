/**
 * Utility functions for score formatting and qualitative evaluations
 */

export function formatScore(score: number | string | null | undefined, fallback: string = '--'): string {
  if (score === null || score === undefined || score === '') return fallback;
  const num = typeof score === 'number' ? score : parseFloat(String(score));
  if (isNaN(num)) return fallback;
  return (Math.round(num * 10) / 10).toFixed(1);
}

export function roundTotalScore(score: number | string | null | undefined): number {
  if (score === null || score === undefined || score === '' || score === '-') return 0;
  const num = typeof score === 'number' ? score : parseFloat(String(score));
  if (isNaN(num)) return 0;
  return Math.round(num); // Standard mathematical rounding to nearest integer (.5+ rounds up, <.5 rounds down)
}

export function formatTotalScore(score: number | string | null | undefined, fallback: string = '0'): string {
  if (score === null || score === undefined || score === '' || score === '-') return fallback;
  const num = typeof score === 'number' ? score : parseFloat(String(score));
  if (isNaN(num)) return fallback;
  return String(Math.round(num)); // Displays nearest integer e.g. 6.5 -> "7", 6.4 -> "6"
}

export function getCurrentSubmissionTimestamp(): string {
  return new Date().toISOString();
}

export function formatSubmissionDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function isSubjectWithScore(subjectName?: string): boolean {
  if (!subjectName) return false;
  const name = subjectName.toLowerCase().trim();
  if (
    name.includes('đạo đức') ||
    name.includes('tự nhiên và xã hội') ||
    name.includes('tnxh') ||
    name.includes('mĩ thuật') ||
    name.includes('mỹ thuật') ||
    name.includes('giáo dục thể chất') ||
    name.includes('gdtc') ||
    name.includes('thể dục') ||
    name.includes('âm nhạc') ||
    name.includes('hoạt động trải nghiệm') ||
    name.includes('hđtn')
  ) {
    return false;
  }
  return true;
}

export function getQualitativeLevel(
  scoreOrCorrectCount?: number | string | null,
  totalQuestions?: number
): 'T' | 'H' | 'CHT' {
  if (scoreOrCorrectCount === null || scoreOrCorrectCount === undefined || scoreOrCorrectCount === '') return 'H';

  if (typeof totalQuestions === 'number' && totalQuestions > 0) {
    const correct = typeof scoreOrCorrectCount === 'number' ? scoreOrCorrectCount : parseFloat(String(scoreOrCorrectCount));
    if (isNaN(correct)) return 'H';
    const ratio = correct / totalQuestions;
    if (ratio >= 0.8) return 'T';
    if (ratio >= 0.5) return 'H';
    return 'CHT';
  }

  const num = typeof scoreOrCorrectCount === 'number' ? scoreOrCorrectCount : parseFloat(String(scoreOrCorrectCount));
  if (isNaN(num)) return 'H';
  if (num >= 8.0) return 'T';
  if (num >= 5.0) return 'H';
  return 'CHT';
}

export function getQualitativeLabel(
  levelOrCorrectCount?: 'T' | 'H' | 'CHT' | string | number | null,
  totalQuestions?: number
): string {
  if (levelOrCorrectCount === null || levelOrCorrectCount === undefined) return 'Hoàn thành (H)';

  if (typeof levelOrCorrectCount === 'number' && typeof totalQuestions === 'number') {
    const lvl = getQualitativeLevel(levelOrCorrectCount, totalQuestions);
    return getQualitativeLabel(lvl);
  }

  if (typeof levelOrCorrectCount === 'number') {
    const lvl = getQualitativeLevel(levelOrCorrectCount);
    return getQualitativeLabel(lvl);
  }

  const str = String(levelOrCorrectCount).trim();
  if (str === 'T') return 'Hoàn thành tốt (T)';
  if (str === 'H') return 'Hoàn thành (H)';
  if (str === 'CHT') return 'Chưa hoàn thành (CHT)';

  const num = parseFloat(str);
  if (!isNaN(num)) {
    const lvl = getQualitativeLevel(num, totalQuestions);
    return getQualitativeLabel(lvl);
  }

  return str;
}

export interface Circular27Evaluation {
  level: 'HTT' | 'HT' | 'CHT';
  levelLabel: string;
  badgeClass: string;
  text: string;
}

/**
 * Tự động tạo đánh giá Mức đạt (HTT / HT / CHT) & nhận xét sư phạm chuẩn Thông tư 27/2020/TT-BGDĐT
 */
export function getCircular27Evaluation(
  studentName?: string,
  score?: number | string | null,
  answers?: Array<'pass' | 'fail' | 'none'>
): Circular27Evaluation {
  const numScore = score === null || score === undefined ? 8 : (typeof score === 'number' ? score : parseFloat(String(score)) || 8);
  const rounded = Math.round(numScore);
  const cleanName = studentName ? studentName.trim() : 'Em';
  const namePart = cleanName.startsWith('Em') ? cleanName : `Em ${cleanName.split(' ').pop()}`;

  // Tìm các câu làm chưa đúng nếu có dữ liệu mảng answers
  const wrongIndices: number[] = [];
  if (Array.isArray(answers)) {
    answers.forEach((ans, i) => {
      if (ans === 'fail') wrongIndices.push(i + 1);
    });
  }

  // 1. Hoàn thành tốt (HTT) - >= 90% (>= 9.0)
  if (rounded >= 9) {
    let comment = `${namePart} nắm rất chắc kiến thức, tư duy nhanh nhạy và hoàn thành xuất sắc các yêu cầu của bài học. Cứ phát huy tinh thần này nhé!`;
    if (rounded === 10) {
      const templates = [
        `${namePart} nắm rất chắc kiến thức, tư duy nhanh nhạy và hoàn thành xuất sắc các yêu cầu của bài học. Cứ phát huy tinh thần này nhé!`,
        `${namePart} hoàn thành xuất sắc bài kiểm tra, tư duy nhanh và chính xác. Đáng khen ngợi!`,
        `Bài làm đạt kết quả tối đa, ${namePart.toLowerCase()} vận dụng tốt các kiến thức đã học. Tuyên dương em!`
      ];
      comment = templates[(cleanName.length + rounded) % templates.length];
    }

    return {
      level: 'HTT',
      levelLabel: 'Hoàn thành tốt',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      text: comment
    };
  }

  // 2. Hoàn thành (HT) - 50% đến < 90% (5.0 đến 8.9)
  if (rounded >= 5) {
    let comment = `${namePart} đã hoàn thành tốt các nội dung cơ bản của bài học. Cần chú ý đọc kỹ đề hơn ở một vài câu vận dụng để đạt kết quả cao hơn nữa nhé.`;
    if (wrongIndices.length > 0 && wrongIndices.length <= 3) {
      const wrongListStr = wrongIndices.map(i => `Câu ${i}`).join(', ');
      comment = `${namePart} đã hoàn thành tốt các nội dung cơ bản, cần chú ý đọc kỹ đề bài và ôn tập lại kiến thức ở ${wrongListStr} nhé.`;
    }

    return {
      level: 'HT',
      levelLabel: 'Hoàn thành',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      text: comment
    };
  }

  // 3. Chưa hoàn thành (CHT) - < 50% (< 5.0)
  let comment = `${namePart} cần cô hướng dẫn thêm và ôn tập lại nội dung bài học này để nắm vững kiến thức cơ bản hơn nhé. Cố gắng lên em!`;
  if (wrongIndices.length > 0) {
    const wrongListStr = wrongIndices.slice(0, 3).map(i => `Câu ${i}`).join(', ');
    comment = `${namePart} chưa nắm vững kiến thức ở ${wrongListStr}. Em cần ôn tập kỹ lại lý thuyết và luyện tập thêm bài tập nhé. Cố gắng lên em!`;
  }

  return {
    level: 'CHT',
    levelLabel: 'Chưa hoàn thành',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    text: comment
  };
}

export function generateCircular27Comment(
  studentName?: string,
  score?: number | string | null,
  answers?: Array<'pass' | 'fail' | 'none'>
): string {
  return getCircular27Evaluation(studentName, score, answers).text;
}

import {
  UserAccount,
  Lesson5EPlan,
  QuestionItem,
  ExamPaper,
  HomeworkAssignment,
  GameItem,
  ActivityLog
} from '../types';

export interface TeacherRecord {
  id: string;
  name: string;            // Họ và tên giáo viên
  email: string;           // Thư điện tử liên hệ
  role: string;            // Vai trò (Tổ trưởng, Giáo viên, Hiệu trưởng, Admin...)
  subject: string;         // Môn học phụ trách
  status: 'active' | 'locked'; // Trạng thái hoạt động
  dob?: string;            // Ngày sinh (dd/mm/yyyy)
  phone?: string;          // Số điện thoại (SĐT)
  sddcn?: string;          // Số định danh cá nhân (SĐDCN / CCCD)
  toChuyenMon: string;     // Tổ chuyên môn (Ban Giám Hiệu, Tổ 1, Tổ 2+3, Tổ 4+5, Tổ Chuyên biệt)
  nhomGvCn?: string;       // Nhóm GVCN / Phụ trách khối
  homeroomClasses?: string[]; // Danh sách lớp chủ nhiệm
  teachingClasses?: string[]; // Danh sách lớp giảng dạy bộ môn
  avatar?: string;         // Icon/Avatar
}

export const PRIMARY_SCHOOL_SUBJECTS = [
  'Tiếng Việt',
  'Toán',
  'Đạo đức',
  'Tự nhiên và Xã hội',
  'Khoa học',
  'Lịch sử và Địa lí',
  'Ngoại ngữ 1 (Tiếng Anh)',
  'Tin học',
  'Công nghệ',
  'Tin học (tự chọn)',
  'Giáo dục thể chất',
  'Mĩ thuật',
  'Âm nhạc',
  'Hoạt động trải nghiệm'
];

export const INITIAL_TEACHERS: TeacherRecord[] = [
  {
    id: 'gv-08',
    name: 'Đặng Văn Hùng',
    email: 'dangtanhung@gmail.com',
    role: 'Hiệu trưởng (BGH)',
    subject: 'Quản lý & Đổi mới giáo dục',
    status: 'active',
    dob: '02/01/1978',
    phone: '0913000999',
    sddcn: '030178001100',
    toChuyenMon: 'Ban Giám Hiệu',
    nhomGvCn: 'Ban Giám Hiệu Nhà Trường',
    avatar: '👨‍💼'
  },
  {
    id: 'gv-10',
    name: 'Nguyễn Thị Thủ',
    email: 'thuthuthtk@gmail.com',
    role: 'Quản trị viên (ADMIN)',
    subject: 'Tin học và Công nghệ',
    status: 'active',
    dob: '01/01/1989',
    phone: '0982957979',
    sddcn: '036189005566',
    toChuyenMon: 'Ban Giám Hiệu',
    nhomGvCn: 'Quản trị hệ thống Dạy và Học Số PK Trực Khang',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-01',
    name: 'Hà Thị Trâm',
    email: 'hathiram@gmail.com',
    role: 'Tổ trưởng chuyên môn',
    subject: 'Toán & Tiếng Việt',
    status: 'active',
    dob: '15/08/1985',
    phone: '0982957979',
    sddcn: '036175020668',
    toChuyenMon: 'Tổ 1',
    nhomGvCn: 'GVCN Lớp 1A - Trưởng nhóm Khối 1',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-02',
    name: 'Lưu Thị Minh',
    email: 'luuminh@gmail.com',
    role: 'Giáo viên bộ môn',
    subject: 'Tiếng Việt & Đạo đức',
    status: 'active',
    dob: '22/11/1990',
    phone: '0912345678',
    sddcn: '038316001234',
    toChuyenMon: 'Tổ 1',
    nhomGvCn: 'GVCN Lớp 1B - Nhóm Khối 1',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-03',
    name: 'Bùi Thị Yến',
    email: 'buiyen@gmail.com',
    role: 'Tổ trưởng chuyên môn',
    subject: 'Toán & Tự nhiên và Xã hội',
    status: 'active',
    dob: '10/05/1988',
    phone: '0978123456',
    sddcn: '034189004567',
    toChuyenMon: 'Tổ 2',
    nhomGvCn: 'GVCN Lớp 2A - Nhóm Khối 2',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-04',
    name: 'Phạm Thị Thanh Thảo',
    email: 'thanhthao@gmail.com',
    role: 'Giáo viên bộ môn',
    subject: 'Tin học và Công nghệ & Hoạt động trải nghiệm',
    status: 'active',
    dob: '05/09/1992',
    phone: '0935678912',
    sddcn: '031192008910',
    toChuyenMon: 'Tổ 3',
    nhomGvCn: 'GVCN Lớp 3C - Nhóm Khối 3',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-06',
    name: 'Trần Thị Diễm Hương',
    email: 'diemhuong@gmail.com',
    role: 'Tổ trưởng chuyên môn',
    subject: 'Toán & Tiếng Việt',
    status: 'active',
    dob: '28/03/1983',
    phone: '0979888777',
    sddcn: '032183009988',
    toChuyenMon: 'Tổ 5',
    nhomGvCn: 'GVCN Lớp 5D - Trưởng nhóm Khối 5',
    avatar: '👩‍🏫',
    homeroomClasses: ['Lớp 5D', 'Lớp 5C'],
    teachingClasses: ['Lớp 5D', 'Lớp 5C']
  },
  {
    id: 'gv-05',
    name: 'Trần Hữu Ích',
    email: 'tranhuuich@gmail.com',
    role: 'Giáo viên bộ môn',
    subject: 'Khoa học & Lịch sử và Địa lí',
    status: 'active',
    dob: '12/12/1984',
    phone: '0905123789',
    sddcn: '030184003456',
    toChuyenMon: 'Tổ 4',
    nhomGvCn: 'GVCN Lớp 4C - Nhóm Khối 4',
    avatar: '👨‍🏫'
  },
  {
    id: 'gv-07',
    name: 'Nguyễn Thị Lê',
    email: 'nguyenle@gmail.com',
    role: 'Giáo viên bộ môn',
    subject: 'Ngoại ngữ 1 (Tiếng Anh)',
    status: 'active',
    dob: '19/07/1995',
    phone: '0963111222',
    sddcn: '037195001122',
    toChuyenMon: 'Tổ 5',
    nhomGvCn: 'Phụ trách Tiếng Anh Khối 3-4-5',
    avatar: '👩‍🏫'
  },
  {
    id: 'gv-09',
    name: 'Đồng Thị Tâm',
    email: 'dongtam@gmail.com',
    role: 'Giáo viên bộ môn',
    subject: 'Âm nhạc & Mĩ thuật',
    status: 'active',
    dob: '25/10/1991',
    phone: '0988555444',
    sddcn: '035191007788',
    toChuyenMon: 'Tổ 4',
    nhomGvCn: 'Nhóm GV Chuyên (Nghệ thuật)',
    avatar: '👩‍🏫'
  }
];

export const INITIAL_DASHBOARD_STATS = {
  totalStudents: 0,
  totalLessons: 0,
  totalExams: 0,
  totalQuestions: 0,
  pendingAssignments: 0,
  averageScore: 0,
};

export const INITIAL_USERS: UserAccount[] = [];

export const INITIAL_LESSONS: Lesson5EPlan[] = [
  {
    id: 'lesson-cn-3-01',
    title: 'Bài 1: Tự nhiên và công nghệ (Môn Công nghệ lớp 3)',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    duration: '45 phút',
    topic: 'Tự nhiên và công nghệ trong đời sống',
    authorName: 'Hà Thị Trâm',
    createdAt: new Date().toISOString(),
    stepEngage: {
      title: '1. Gắn kết (Engage)',
      subtitle: 'Khơi gợi hứng thú và kết nối kinh nghiệm thực tế',
      objectives: 'Học sinh nhận biết sự khác biệt ban đầu giữa đồ vật do con người làm ra và các sự vật có sẵn trong tự nhiên.',
      teacherActivities: 'Tổ chức trò chơi "Ai tinh mắt": Giáo viên chiếu hình ảnh mặt trời, dòng sông, cái bàn, máy bay và yêu cầu học sinh phân loại nhanh.',
      studentActivities: 'Học sinh quan sát tranh ảnh, giơ tay trả lời và thảo luận sôi nổi.',
      materials: 'Tranh ảnh trực quan, máy chiếu projector.'
    },
    stepExplore: {
      title: '2. Khám phá (Explore)',
      subtitle: 'Trải nghiệm và tìm hiểu đặc điểm đối tượng',
      objectives: 'Học sinh phân biệt rõ đối tượng tự nhiên và sản phẩm công nghệ.',
      teacherActivities: 'Chia lớp thành 4 nhóm, phát phiếu học tập yêu cầu liệt kê 5 vật tự nhiên và 5 sản phẩm công nghệ xung quanh lớp học.',
      studentActivities: 'Các nhóm thảo luận, ghi phiếu học tập và trình bày trước lớp.',
      materials: 'Phiếu học tập nhóm, bút dạ.'
    },
    stepElaborate: {
      title: '3. Áp dụng & Mở rộng (Elaborate)',
      subtitle: 'Vận dụng kiến thức vào thực tiễn đời sống',
      objectives: 'Hiểu vai trò của sản phẩm công nghệ trong việc nâng cao chất lượng cuộc sống.',
      teacherActivities: 'Đặt câu hỏi gợi mở: "Nếu không có quạt điện và đèn điện vào mùa hè, cuộc sống của chúng ta sẽ thế nào?"',
      studentActivities: 'Học sinh liên hệ thực tế gia đình và phát biểu ý kiến cá nhân.',
      materials: 'Sách giáo khoa Công nghệ lớp 3.'
    },
    stepEvaluate: {
      title: '4. Đánh giá (Evaluate)',
      subtitle: 'Đánh giá năng lực và củng cố bài học',
      objectives: 'Kiểm tra mức độ nắm vững khái niệm tự nhiên và sản phẩm công nghệ của học sinh.',
      teacherActivities: 'Yêu cầu học sinh làm bài tập trắc nghiệm 5 câu trên hệ thống học tập trực tuyến.',
      studentActivities: 'Làm bài kiểm tra cá nhân trên máy tính bảng hoặc phiếu đánh giá.',
      materials: 'Hệ thống trắc nghiệm trực tuyến.'
    }
  },
  {
    id: 'lesson-th-3-02',
    title: 'Bài 2: Thông tin và quyết định (Môn Tin học lớp 3)',
    subject: 'Tin học',
    grade: 'Khối 3',
    duration: '45 phút',
    topic: 'Thông tin quanh ta',
    authorName: 'Nguyễn Thị Thủ',
    createdAt: new Date().toISOString(),
    stepEngage: {
      title: '1. Gắn kết (Engage)',
      subtitle: 'Tình huống mở đầu',
      objectives: 'Nhận biết vai trò của thông tin trong đời sống.',
      teacherActivities: 'Kể câu chuyện về việc nghe tiếng còi xe cứu thương nhường đường.',
      studentActivities: 'Lắng nghe và suy ngẫm về tình huống.',
      materials: 'Loa phát thanh, tranh minh họa.'
    },
    stepExplore: {
      title: '2. Khám phá (Explore)',
      subtitle: 'Tìm hiểu mối quan hệ giữa thông tin và quyết định',
      objectives: 'Hiểu quy trình: Nhận thông tin -> Xử lý -> Ra quyết định.',
      teacherActivities: 'Hướng dẫn học sinh phân tích các tín hiệu đèn giao thông.',
      studentActivities: 'Thảo luận nhóm đôi và đưa ra kết luận.',
      materials: 'Mô hình đèn giao thông mini.'
    },
    stepElaborate: {
      title: '3. Mở rộng (Elaborate)',
      subtitle: 'Xử lý tình huống thực tế',
      objectives: 'Vận dụng xử lý thông tin an toàn khi ở nhà và trường học.',
      teacherActivities: 'Đưa ra các tình huống giả định (ngửi thấy mùi khét, nghe trống trường).',
      studentActivities: 'Đóng vai xử lý tình huống.',
      materials: 'Thẻ tình huống.'
    },
    stepEvaluate: {
      title: '4. Đánh giá (Evaluate)',
      subtitle: 'Tổng kết đánh giá',
      objectives: 'Đánh giá mức độ hiểu bài của học sinh qua câu hỏi trắc nghiệm.',
      teacherActivities: 'Tổ chức minigame trắc nghiệm nhanh trên hệ thống học tập.',
      studentActivities: 'Tham gia trò chơi trả lời câu hỏi.',
      materials: 'Phần mềm trò chơi học tập tương tác.'
    }
  }
];

export const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [
  {
    id: 'hw-001',
    title: 'Bài tập về nhà: Ôn tập Tự nhiên và Công nghệ (Tuần 1)',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    targetClass: 'Lớp 3C',
    teacherName: 'Hà Thị Trâm',
    dueDate: '05/09/2026',
    assignedDate: '31/08/2026',
    description: 'Học sinh làm các câu hỏi trắc nghiệm ôn tập bài 1 và nộp lại hệ thống trước ngày 05/09/2026.',
    totalStudents: 38,
    completedCount: 28,
    isApproved: true,
    authorType: 'my',
    submissions: [
      {
        id: 'sub-1',
        studentId: 'st-3a-1',
        studentName: 'Hoàng Bảo An',
        submittedAt: '31/08/2026 10:15',
        content: 'Đã hoàn thành xuất sắc 10/10 câu hỏi trắc nghiệm.',
        score: 10,
        feedback: 'Bài làm rất tốt, cẩn thận!',
        status: 'graded'
      },
      {
        id: 'sub-2',
        studentId: 'st-3a-2',
        studentName: 'Phạm Lê Khang An',
        submittedAt: '31/08/2026 11:00',
        content: 'Đã hoàn thành bài tập.',
        score: 9.5,
        feedback: 'Làm bài chính xác.',
        status: 'graded'
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'hw-002',
    title: 'Thực hành Tin học: Thông tin và quyết định',
    subject: 'Tin học',
    grade: 'Khối 3',
    targetClass: 'Lớp 3B',
    teacherName: 'Nguyễn Thị Thủ',
    dueDate: '06/09/2026',
    assignedDate: '31/08/2026',
    description: 'Hoàn thành phiếu bài tập tương tác trên hệ thống học tập trực tuyến.',
    totalStudents: 35,
    completedCount: 30,
    isApproved: true,
    authorType: 'colleague',
    submissions: [],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-cn3-01',
    code: 'CH-CN3-01',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    level: 'nhan_biet',
    type: 'multiple_response',
    lessonName: 'Bài 1: Tự nhiên và công nghệ',
    content: 'Đâu là đối tượng thuộc tự nhiên?',
    options: [
      'A. Cái bàn học',
      'B. Con sông, ngọn núi',
      'C. Chiếc điện thoại thông minh',
      'D. Xe đạp'
    ],
    correctAnswer: 'B',
    explanation: 'Con sông, ngọn núi là những thực thể hình thành tự nhiên, không do con người chế tạo.'
  },
  {
    id: 'q-cn3-02',
    code: 'CH-CN3-02',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'multiple_choice',
    lessonName: 'Bài 1: Tự nhiên và công nghệ',
    content: 'Đâu là sản phẩm do con người làm ra (sản phẩm công nghệ)?',
    options: [
      'A. Mặt trăng',
      'B. Cây cối trong rừng',
      'C. Máy bay',
      'D. Đám mây'
    ],
    correctAnswer: 'C',
    explanation: 'Máy bay là phương tiện công nghệ phức tạp do con người nghiên cứu chế tạo để di chuyển trên không.'
  },
  {
    id: 'q-cn3-03',
    code: 'CH-CN3-03',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    level: 'nhan_biet',
    type: 'multiple_choice',
    lessonName: 'Bài 1: Tự nhiên và công nghệ',
    content: 'Mặt trời là đối tượng thuộc loại nào sau đây?',
    options: [
      'A. Đối tượng tự nhiên',
      'B. Sản phẩm công nghệ',
      'C. Máy móc hiện đại',
      'D. Đồ chơi tự tạo'
    ],
    correctAnswer: 'A',
    explanation: 'Mặt trời là thiên thể tự nhiên chiếu sáng và sưởi ấm cho Trái đất.'
  },
  {
    id: 'q-cn3-04',
    code: 'CH-CN3-04',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'multiple_response',
    lessonName: 'Bài 1: Tự nhiên và công nghệ',
    content: 'Đâu là những tác dụng của sản phẩm công nghệ đối với đời sống con người? (Chọn các phương án đúng)',
    options: [
      'A. Giúp con người làm việc và học tập hiệu quả, nhanh chóng hơn',
      'B. Nâng cao chất lượng cuộc sống và tiện nghi sinh hoạt',
      'C. Giúp con người liên lạc, giao tiếp từ xa dễ dàng',
      'D. Thay thế hoàn toàn mọi quy luật của tự nhiên'
    ],
    correctAnswer: 'A, B, C',
    explanation: 'Sản phẩm công nghệ hỗ trợ đắc lực cho đời sống con người nhưng không thể thay thế tự nhiên.'
  },
  {
    id: 'q-cn4-01',
    code: 'CH-CN4-01',
    subject: 'Công nghệ',
    grade: 'Khối 4',
    level: 'nhan_biet',
    type: 'multiple_choice',
    lessonName: 'Bài 1: Hoa và cây cảnh trong đời sống',
    content: 'Hoa và cây cảnh có vai trò chính nào trong không gian sống của gia đình?',
    options: [
      'A. Trang trí, làm đẹp không gian và thanh lọc không khí',
      'B. Dùng làm nguyên liệu chế tạo máy tính',
      'C. Thay thế cho các bữa ăn chính',
      'D. Làm nhiên liệu vận hành xe máy'
    ],
    correctAnswer: 'A',
    explanation: 'Hoa và cây cảnh giúp trang trí nhà cửa, mang lại vẻ đẹp tự nhiên và thanh lọc không khí.'
  },
  {
    id: 'q-cn4-02',
    code: 'CH-CN4-02',
    subject: 'Công nghệ',
    grade: 'Khối 4',
    level: 'thong_hieu',
    type: 'multiple_choice',
    lessonName: 'Bài 2: Trồng hoa, cây cảnh trong chậu',
    content: 'Khi trồng cây cảnh trong chậu, bộ phận nào của chậu có vai trò giúp rễ cây không bị úng nước?',
    options: [
      'A. Lỗ thoát nước ở đáy chậu',
      'B. Mép chậu',
      'C. Thân chậu',
      'D. Đĩa lót bên dưới'
    ],
    correctAnswer: 'A',
    explanation: 'Lỗ thoát nước ở đáy chậu xả bớt lượng nước thừa khi tưới, giúp rễ cây hô hấp tốt và không bị thối rễ.'
  },
  {
    id: 'q-cn4-03',
    code: 'CH-CN4-03',
    subject: 'Công nghệ',
    grade: 'Khối 4',
    level: 'thong_hieu',
    type: 'true_false',
    lessonName: 'Bài 3: Chăm sóc hoa, cây cảnh trong chậu',
    content: 'Xác định tính Đúng hoặc Sai cho các biện pháp chăm sóc cây cảnh trong chậu:',
    statements: [
      { statement: 'Tưới nước vừa đủ ẩm phù hợp với nhu cầu từng loại cây.', isCorrect: true, explanation: 'ĐÚNG. Mỗi loại cây có nhu cầu nước khác nhau.' },
      { statement: 'Đặt chậu cây hoàn toàn trong góc tối không tiếp xúc ánh sáng.', isCorrect: false, explanation: 'SAI. Cây cần ánh sáng để quang hợp.' },
      { statement: 'Nhặt bỏ lá vàng mục và lau sạch bụi trên bề mặt lá.', isCorrect: true, explanation: 'ĐÚNG. Vệ sinh lá giúp cây trao đổi khí tốt hơn.' }
    ],
    correctAnswer: '1-Đúng, 2-Sai, 3-Đúng',
    explanation: 'Chăm sóc cây đúng cách cần cân đối lượng nước, ánh sáng và vệ sinh phòng sâu bệnh.'
  },
  {
    id: 'q-cn4-04',
    code: 'CH-CN4-04',
    subject: 'Công nghệ',
    grade: 'Khối 4',
    level: 'nhan_biet',
    type: 'multiple_choice',
    lessonName: 'Bài 4: Giới thiệu bộ lắp ghép mô hình kỹ thuật',
    content: 'Chi tiết nào sau đây thuộc bộ dụng cụ lắp ghép mô hình kỹ thuật môn Công nghệ lớp 4?',
    options: [
      'A. Thanh thẳng, tấm nền, bánh xe và ốc vít',
      'B. Chuột và bàn phím máy tính',
      'C. Vở bài tập Tiếng Việt',
      'D. Thước kẻ và đĩa CD'
    ],
    correctAnswer: 'A',
    explanation: 'Bộ lắp ghép mô hình kỹ thuật gồm thanh thẳng, tấm phẳng, bánh xe, trục và các ốc vít.'
  },
  {
    id: 'q-preset-1-init',
    code: 'CH-TH3-01',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'nhan_biet',
    type: 'multiple_choice',
    lessonName: 'Thông tin và quyết định',
    content: 'Thông tin thời tiết cho biết hôm nay trời sẽ mưa lớn. Theo em, em cần đưa ra quyết định nào sau đây là hợp lý nhất?',
    options: [
      'A. Mang theo áo mưa hoặc ô (dù).',
      'B. Rủ bạn ra sân trường đá bóng không cần che chắn.',
      'C. Mặc quần áo mỏng nhẹ và đi giày vải trắng.',
      'D. Không cần quan tâm đến thời tiết.'
    ],
    correctAnswer: 'A',
    explanation: 'Khi biết trời mưa lớn, quyết định mang theo áo mưa hoặc ô giúp tránh bị ướt và bảo vệ sức khỏe tốt nhất.'
  },
  {
    id: 'q-preset-2-init',
    code: 'CH-TH3-02',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'multiple_response',
    lessonName: 'Thông tin và quyết định',
    content: 'Đâu là những ví dụ cho thấy con người cần phải xử lý thông tin trước khi đưa ra quyết định? (Chọn các đáp án đúng)',
    options: [
      'A. Nhìn thấy đèn giao thông chuyển sang màu đỏ, em dừng xe lại.',
      'B. Nghe tiếng trống trường tập trung, các bạn học sinh xếp hàng vào lớp.',
      'C. Cầm một hòn đá nặng trên tay mà không suy nghĩ gì.',
      'D. Nhìn thấy biển báo "Trơn trượt", em đi chậm và cẩn thận hơn để tránh ngã.'
    ],
    correctAnswer: 'A, B, D',
    explanation: 'Nhìn đèn đỏ (xử lý thông tin đèn) dừng xe; nghe tiếng trống (xử lý thông tin âm thanh) xếp hàng; nhìn biển báo trơn trượt (xử lý thông tin hình ảnh) đi chậm đều là quyết định dựa trên xử lý thông tin.'
  },
  {
    id: 'q-preset-3-init',
    code: 'CH-TH3-03',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'nhan_biet',
    type: 'true_false',
    lessonName: 'Thông tin và quyết định',
    content: 'Xác định tính Đúng hoặc Sai cho các phát biểu sau về thông tin và quyết định:',
    statements: [
      { statement: 'Thông tin thu nhận được từ thế giới xung quanh giúp con người đưa ra quyết định đúng đắn.', isCorrect: true, explanation: 'ĐÚNG. Thông tin chuẩn xác giúp chúng ta lựa chọn hành động tối ưu.' },
      { statement: 'Quyết định của chúng ta không cần phải dựa vào thông tin thực tế.', isCorrect: false, explanation: 'SAI. Quyết định không dựa vào thực tế khách quan rất dễ gặp sai lầm và nguy hiểm.' },
      { statement: 'Khi nghe tiếng còi xe cứu thương đang hú, quyết định nhường đường là một quyết định dựa trên thông tin âm thanh.', isCorrect: true, explanation: 'ĐÚNG. Tiếng còi xe cứu thương là nguồn thông tin âm thanh báo khẩn cấp để ta đưa ra quyết định nhường đường.' }
    ],
    correctAnswer: '1-Đúng, 2-Sai, 3-Đúng',
    explanation: 'Thông tin từ thế giới xung quanh đóng vai trò nền tảng giúp định hình và tối ưu hóa các quyết định thực tế.'
  },
  {
    id: 'q-preset-4-init',
    code: 'CH-TH3-04',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'fill_blank',
    lessonName: 'Thông tin và quyết định',
    content: 'Điền từ thích hợp vào chỗ trống: "Trước khi ra đường vào buổi trưa nắng gắt, em nhận được thông tin trời rất nắng nóng. Thông tin đó giúp em đưa ra quyết định mang theo mũ, áo chống nắng và uống đủ nước để bảo vệ..."',
    correctAnswer: 'sức khỏe',
    explanation: 'Cụm từ "bảo vệ sức khỏe" hoặc "bản thân" là phù hợp nhất để hoàn thành ý nghĩa câu hỏi sư phạm.'
  },
  {
    id: 'q-preset-5-init',
    code: 'CH-TH3-05',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'ordering',
    lessonName: 'Thông tin và quyết định',
    content: 'Em hãy sắp xếp các bước sau theo đúng thứ tự từ lúc nhận được thông tin đến khi đưa ra hành động/quyết định:',
    options: [
      'Thu nhận thông tin từ môi trường xung quanh (nhìn, nghe, sờ,...).',
      'Xử lý và suy nghĩ về thông tin vừa nhận được.',
      'Đưa ra quyết định (làm gì hoặc không làm gì).',
      'Thực hiện hành động theo quyết định.'
    ],
    correctAnswer: '1 -> 2 -> 3 -> 4',
    explanation: 'Quy trình xử lý hành vi con người: 1 (Thu nhận thông tin) -> 2 (Xử lý và suy nghĩ) -> 3 (Đưa ra quyết định) -> 4 (Thực hiện hành động).'
  },
  {
    id: 'q-preset-6-init',
    code: 'CH-TH3-06',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'thong_hieu',
    type: 'matching',
    lessonName: 'Thông tin và quyết định',
    content: 'Nối tình huống ở cột A với quyết định tương ứng ở cột B:',
    matchingPairs: [
      { left: 'Thấy bài tập cô giao có câu hỏi khó chưa hiểu.', right: 'Nhờ thầy cô hoặc cha mẹ giải thích thêm.' },
      { left: 'Nhận được thông báo an toàn giao thông từ nhà trường.', right: 'Đội mũ bảo hiểm trước khi ngồi lên xe máy.' },
      { left: 'Nghe tiếng chuông báo thức reo vào buổi sáng.', right: 'Tắt chuông và thức dậy chuẩn bị đi học.' }
    ],
    correctAnswer: '1 - Nhờ thầy cô hoặc cha mẹ giải thích thêm; 2 - Đội mũ bảo hiểm trước khi ngồi lên xe máy; 3 - Tắt chuông và thức dậy chuẩn bị đi học',
    explanation: 'Bài tập khó nối với nhờ trợ giúp; thông báo an toàn nối với đội mũ bảo hiểm; chuông báo thức nối với thức dậy đi học.'
  },
  {
    id: 'q-preset-7-init',
    code: 'CH-TH3-07',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'van_dung',
    type: 'classification',
    lessonName: 'Thông tin và quyết định',
    content: 'Hãy phân loại các hành động sau thành hai nhóm: Nhóm A (Quyết định đúng đắn dựa trên thông tin) và Nhóm B (Quyết định chưa phù hợp).',
    classificationGroups: ['Nhóm A (Quyết định đúng đắn dựa trên thông tin)', 'Nhóm B (Quyết định chưa phù hợp)'],
    classificationItems: [
      { name: 'Thấy biển báo "Khu vực nước sâu, nguy hiểm", Nam quyết định không xuống tắm hồ.', group: 'Nhóm A (Quyết định đúng đắn dựa trên thông tin)' },
      { name: 'Trời đang mưa to sấm chớp, Lan quyết định ra gốc cây đứng trú mưa.', group: 'Nhóm B (Quyết định chưa phù hợp)' },
      { name: 'Nhìn thấy đèn xanh, người đi bộ qua đường đúng phần đường quy định.', group: 'Nhóm A (Quyết định đúng đắn dựa trên thông tin)' },
      { name: 'Ngửi thấy mùi khét trong nhà bếp, Minh cứ tiếp tục đi ngủ không báo cho ai.', group: 'Nhóm B (Quyết định chưa phù hợp)' }
    ],
    correctAnswer: 'Nhóm A: a, c; Nhóm B: b, d',
    explanation: 'Trú mưa gốc cây rất nguy hiểm do dễ sét đánh; ngửi khét đi ngủ gây nguy cơ hỏa hoạn.'
  },
  {
    id: 'q-preset-8-init',
    code: 'CH-TH3-08',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'van_dung',
    type: 'multiple_choice',
    lessonName: 'Thông tin và quyết định',
    content: 'Hà đang sử dụng máy tính thì màn hình bỗng xuất hiện bảng thông báo lỗi và máy bị đứng hình (đơ). Nếu là Hà, em sẽ đưa ra quyết định xử lý bước đầu như thế nào cho an toàn và hợp lý?',
    options: [
      'A. Tự ý dùng tuốc nơ vít tháo tung thùng máy tính ra xem bên trong.',
      'B. Lấy nước xịt trực tiếp vào màn hình để làm mát máy.',
      'C. Báo ngay cho thầy cô giáo hoặc người lớn biết để được hỗ trợ kiểm tra.',
      'D. Cố gắng đập mạnh vào bàn phím nhiều lần cho máy chạy lại.'
    ],
    correctAnswer: 'C',
    explanation: 'Khi thiết bị trường học hỏng, lựa chọn an toàn và thông minh nhất là báo thầy cô kỹ thuật hỗ trợ thay vì tự ý xử lý gây chập điện.'
  },
  {
    id: 'q-preset-9-init',
    code: 'CH-TH3-09',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'van_dung_cao',
    type: 'essay',
    lessonName: 'Thông tin và quyết định',
    content: 'Đọc tình huống: "Em đang đi trong siêu thị thì vô tình bị lạc mất bố mẹ. Em nhớ lại thông tin bố mẹ đã dặn từ trước: \'Nếu bị lạc, hãy đứng yên tại chỗ hoặc tìm chú bảo vệ để nhờ trợ giúp\'." Dựa vào thông tin trên, quyết định sáng suốt nhất của em ngay lúc đó là gì?',
    correctAnswer: 'Đứng yên tại vị trí bị lạc để bố mẹ dễ tìm kiếm hoặc nhanh chóng tìm người hỗ trợ đồng phục bảo vệ để phát loa thông báo.',
    explanation: 'Bình tĩnh tuân theo chỉ dẫn định sẵn là phản xạ an toàn cực kỳ thiết yếu cho trẻ nhỏ khi lạc nơi công cộng.'
  },
  {
    id: 'q-preset-10-init',
    code: 'CH-TH3-10',
    subject: 'Tin học',
    grade: 'Khối 3',
    level: 'van_dung_cao',
    type: 'essay',
    lessonName: 'Thông tin và quyết định',
    content: 'Em hãy nêu một ví dụ thực tế trong cuộc sống hàng ngày ở trường học của em, trong đó cho thấy thông tin em nhận được đã giúp em đưa ra một quyết định chính xác để đảm bảo an toàn hoặc học tập tốt hơn.',
    correctAnswer: 'Ví dụ: Khi nghe tiếng trống trường báo giờ vào học, em dừng chơi đùa và xếp hàng nhanh chóng để vào lớp. Thông tin âm thanh giúp em chuẩn bị tư thế học tập đúng nội quy học đường.',
    explanation: 'Học sinh vận dụng liên hệ từ các tình huống đa giác quan (chuông báo, biển hiệu, lời nhắc nhở của thầy cô).'
  }
];

export const INITIAL_EXAMS: ExamPaper[] = [
  {
    id: 'TEST-00452',
    title: 'Đề kiểm tra: Luyện tập bài 1: Tự nhiên và công nghệ',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    durationMinutes: 15,
    matrix: {
      nhanBiet: 4,
      thongHieu: 3,
      vanDung: 2,
      vanDungCao: 1
    },
    questions: [
      {
        id: 'q1',
        code: 'Q-001',
        subject: 'Công nghệ',
        grade: 'Khối 3',
        level: 'nhan_biet',
        type: 'multiple_choice',
        content: 'Mặt trời là đối tượng thuộc loại nào sau đây?',
        options: ['A. Đối tượng tự nhiên', 'B. Sản phẩm công nghệ', 'C. Máy móc', 'D. Đồ chơi'],
        correctAnswer: 'A',
      },
      {
        id: 'q2',
        code: 'Q-002',
        subject: 'Công nghệ',
        grade: 'Khối 3',
        level: 'nhan_biet',
        type: 'multiple_choice',
        content: 'Quạt điện là đối tượng thuộc loại nào sau đây?',
        options: ['A. Đối tượng tự nhiên', 'B. Sản phẩm công nghệ', 'C. Động vật', 'D. Cây cối'],
        correctAnswer: 'B',
      }
    ],
    createdBy: 'gv01',
    createdAt: new Date().toISOString(),
    status: 'draft',
    targetClass: 'Lớp 3C',
    examType: 'Thường xuyên',
    submissionsCount: 12,
    totalStudents: 38
  },
  {
    id: 'TEST-00453',
    title: 'Kiểm tra 15 phút: Thông tin và quyết định',
    subject: 'Tin học',
    grade: 'Khối 4',
    durationMinutes: 15,
    matrix: {
      nhanBiet: 3,
      thongHieu: 2,
      vanDung: 0,
      vanDungCao: 0
    },
    questions: [
      {
        id: 'q3',
        code: 'Q-003',
        subject: 'Tin học',
        grade: 'Khối 4',
        level: 'nhan_biet',
        type: 'multiple_choice',
        content: 'Khi nghe tiếng chuông báo cháy, em cần làm gì?',
        options: ['A. Chạy trốn', 'B. Di tản an toàn', 'C. Đứng nhìn', 'D. Bỏ qua'],
        correctAnswer: 'B',
      }
    ],
    createdBy: 'gv01',
    createdAt: new Date().toISOString(),
    status: 'published',
    targetClass: 'Lớp 4C',
    examType: 'Thường xuyên',
    startTime: '2026-08-31T06:00:00Z',
    endTime: '2026-08-31T23:59:00Z',
    submissionsCount: 23,
    totalStudents: 35,
    originalExamId: 'TEST-00453'
  },
  {
    id: 'TEST-00453-class-lop4d',
    title: 'Kiểm tra 15 phút: Thông tin và quyết định',
    subject: 'Tin học',
    grade: 'Khối 4',
    durationMinutes: 15,
    matrix: {
      nhanBiet: 3,
      thongHieu: 2,
      vanDung: 0,
      vanDungCao: 0
    },
    questions: [
      {
        id: 'q3',
        code: 'Q-003',
        subject: 'Tin học',
        grade: 'Khối 4',
        level: 'nhan_biet',
        type: 'multiple_choice',
        content: 'Khi nghe tiếng chuông báo cháy, em cần làm gì?',
        options: ['A. Chạy trốn', 'B. Di tản an toàn', 'C. Đứng nhìn', 'D. Bỏ qua'],
        correctAnswer: 'B',
      }
    ],
    createdBy: 'gv01',
    createdAt: new Date().toISOString(),
    status: 'published',
    targetClass: 'Lớp 4D',
    examType: 'Thường xuyên',
    startTime: '2026-08-31T06:00:00Z',
    endTime: '2026-08-31T23:59:00Z',
    submissionsCount: 22,
    totalStudents: 35,
    originalExamId: 'TEST-00453'
  }
];

export const INITIAL_GAMES: GameItem[] = [
  {
    id: 'game-1',
    title: '🔔 Rung Chuông Vàng Trực Tuyến',
    type: 'golden_bell',
    subject: 'Tất cả môn',
    grade: 'Mọi khối lớp',
    description: 'Đấu trí loại trực tiếp qua các câu hỏi kiến thức.',
    playersCount: 0,
    questions: []
  },
  {
    id: 'game-2',
    title: '⚡ Trắc Nghiệm Tốc Độ',
    type: 'speed_quiz',
    subject: 'Tất cả môn',
    grade: 'Mọi khối lớp',
    description: 'Thử thách phản xạ nhanh với các câu hỏi.',
    playersCount: 0,
    questions: []
  },
  {
    id: 'game-3',
    title: '🎯 Vòng Quay May Mắn Chọn Học Sinh',
    type: 'lucky_wheel',
    subject: 'Tất cả môn',
    grade: 'Mọi khối lớp',
    description: 'Quay ngẫu nhiên chọn học sinh trả lời câu hỏi.',
    playersCount: 0,
    questions: []
  },
  {
    id: 'game-4',
    title: '🎴 Flashcard Ôn Tập Thuật Ngữ',
    type: 'flashcards',
    subject: 'Tất cả môn',
    grade: 'Mọi khối lớp',
    description: 'Lật thẻ ghi nhớ kiến thức lý thuyết.',
    playersCount: 0,
    questions: []
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

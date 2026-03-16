# Nebula Chess - AI Powered Strategy Game

Đây là một trò chơi Cờ Vua 2D nâng cao, được phát hành dành cho báo cáo đồ án học phần Công nghệ thông tin. Dự án tích hợp các thuật toán tìm kiếm và xử lý logic phức tạp, minh họa hoàn hảo cho kỹ năng lập trình hướng đối tượng (OOP) và giải thuật AI.

## 🚀 Hướng dẫn khởi động
1. Tải toàn bộ mã nguồn về máy.
2. Mở file `index.html` trong thư mục `chess-project` bằng trình duyệt web.

## 🎮 Tính năng nổi bật
- **Luật chơi đầy đủ**: Hỗ trợ di chuyển hợp lệ cho tất cả các quân cờ, kiểm tra trạng thái Chiếu (Check).
- **Trí tuệ nhân tạo (AI)**: Người chơi đấu với máy bằng thuật toán **Minimax** tích hợp **Cắt tỉa Alpha-Beta**.
- **Giao diện hiện đại**: Sử dụng CSS Glassmorphism, hiệu ứng highlight nước đi và lịch sử đấu.
- **Tính năng hoàn tác (Undo)**: Cho phép người chơi rút lại nước đi để thử nghiệm các chiến thuật khác nhau.

## 📄 Gợi ý nội dung báo cáo đồ án IT
Dưới đây là các phần quan trọng bạn có thể đưa vào báo cáo:

### 1. Kiến trúc hệ thống (System Architecture)
- Sử dụng mô hình **MVC (Model-View-Controller)** đơn giản hóa:
  - **Model**: `board.js`, `pieces.js` (Xử lý dữ liệu và luật chơi).
  - **View**: `ui.js`, `index.html`, `style.css` (Hiển thị và tương tác).
  - **Controller**: `main.js` (Kết nối logic giữa người chơi và máy).

### 2. Thuật toán Trí tuệ nhân tạo (AI Algorithms)
- **Minimax Algorithm**: Mô phỏng cây quyết định để tìm nước đi tối ưu.
- **Alpha-Beta Pruning**: Kỹ thuật tối ưu hóa giúp giảm số lượng nhánh cần duyệt, tăng tốc độ tính toán cho AI.
- **Heuristic Evaluation**: Hàm đánh giá bàn cờ dựa trên giá trị quân cờ (Hậu=90, Xe=50, v.v.).

### 3. Xử lý logic nước đi
- Thuật toán đệ quy kiểm tra trạng thái "Chiếu": Giả định một nước đi, nếu sau nước đi đó Vua vẫn bị tấn công thì nước đi đó không hợp lệ.

### 4. Kết luận công nghệ
- Minh họa khả năng xử lý bất đồng bộ trong JavaScript (`setTimeout` cho AI suy nghĩ) và thao tác DOM hiệu quả.

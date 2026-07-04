# Hệ Thống Ôn Tập Trắc Nghiệm CSDL

Đây là ứng dụng web hỗ trợ ôn tập trắc nghiệm môn Cơ sở dữ liệu, được phát triển bằng HTML5, CSS3 và Vanilla JavaScript.

## 🚀 Hướng dẫn chạy dự án

Vì dự án sử dụng `fetch()` để tải dữ liệu từ file JSON, bạn cần chạy thông qua một **Local Server** (trình duyệt sẽ chặn truy cập file trực tiếp vì lý do bảo mật).

### Bước 1: Mở dự án
1. Mở Visual Studio Code.
2. Chọn `File` > `Open Folder...` và trỏ đến thư mục chứa 4 file của dự án (`index.html`, `style.css`, `script.js`, `CSDL.json`).

### Bước 2: Chạy với Live Server
Nếu bạn đã có VS Code, đây là cách nhanh nhất:
1. Nhấn vào biểu tượng **Extensions** ở thanh công cụ bên trái (hoặc nhấn `Ctrl + Shift + X`).
2. Gõ tìm kiếm **"Live Server"** (tác giả *Ritwick Dey*).
3. Nhấn **Install**.
4. Sau khi cài xong, mở file `index.html`.
5. Nhìn xuống góc dưới cùng bên phải của VS Code, nhấn nút **"Go Live"**.
6. Trình duyệt sẽ tự động mở trang web của bạn tại `http://127.0.0.1:5500`.

---

## 📂 Cấu trúc dự án
*   `index.html`: Giao diện chính của hệ thống.
*   `style.css`: File định dạng giao diện, đảm bảo tính responsive và UI/UX.
*   `script.js`: File xử lý logic, load dữ liệu JSON và điều khiển luồng ôn tập.
*   `CSDL.json`: File dữ liệu câu hỏi (Đảm bảo file này nằm cùng thư mục).

## 🛠 Cách sửa đổi dữ liệu
*   Để cập nhật câu hỏi, bạn chỉ cần chỉnh sửa nội dung trong file `CSDL.json` theo đúng cấu trúc JSON đã định nghĩa.
*   Nếu thay đổi tên file dữ liệu, hãy cập nhật lại tên file tương ứng trong hàm `fetch()` tại dòng 30 của file `script.js`[cite: 5].

## 💡 Lưu ý
*   Nếu trang web không hiển thị câu hỏi, hãy mở **Developer Tools** (Nhấn `F12` trên trình duyệt) -> chọn tab **Console** để xem có lỗi nào không (thường là lỗi đường dẫn hoặc lỗi cú pháp JSON).
*   Đảm bảo file JSON của bạn là một mảng đối tượng hợp lệ `[{...}, {...}]`[cite: 5].

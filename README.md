# AZ-500 Question Bank — Web App ôn thi offline

Web app tra cứu & luyện tập **308 câu hỏi** cho kỳ thi **AZ-500 (Microsoft Azure Security Technologies)**,
kèm đầy đủ **217 hình ảnh** minh hoạ. Chạy hoàn toàn offline, không cần cài đặt gì.

## Cách dùng

Nhấn đôi vào `index.html` — xong. Không cần server, không cần npm install.

> Nếu muốn chạy qua HTTP (ví dụ để mở trên điện thoại cùng mạng LAN):
> ```bash
> npx serve .
> ```

## Ba chế độ

| Chế độ | Mục đích |
|---|---|
| 🔍 **Tra cứu** | Xem toàn bộ câu hỏi kèm đáp án. Tìm kiếm tức thời theo nội dung câu hỏi *và* đáp án, có highlight từ khoá. Lọc theo: đã đánh dấu ⭐, nhiều đáp án, có hình ảnh, dạng Lab, từng trả lời sai. Có nút **Ẩn đáp án** để tự kiểm tra. |
| 🎯 **Luyện tập** | Từng câu một, thứ tự ngẫu nhiên. Chọn đáp án → kiểm tra ngay, thống kê đúng/sai tích luỹ theo từng câu. Có chế độ luyện riêng **câu đã đánh dấu** hoặc **câu từng trả lời sai**. |
| ⏱️ **Thi thử** | Chọn 20/40/60/100/toàn bộ câu, giới hạn thời gian, mốc điểm đạt. Đáp án chỉ hiện sau khi nộp. Kết quả có bảng điều hướng màu (xanh đúng / đỏ sai) và phần xem lại chi tiết từng câu. Nộp xong có thể chuyển ngay các câu sai sang chế độ luyện tập. |

## Phím tắt

| Phím | Tác dụng |
|---|---|
| `/` | Nhảy tới ô tìm kiếm |
| `1`–`6` | Chọn đáp án A–F |
| `Enter` | Kiểm tra / sang câu tiếp |
| `←` `→` | Chuyển câu |
| `S` | Đánh dấu ⭐ câu hiện tại |
| `Esc` | Đóng ảnh phóng to |

Bấm vào hình ảnh bất kỳ để xem phóng to.

## Ghi chú về nội dung

- **Câu nhiều đáp án**: 12 câu có nhiều hơn một đáp án đúng — được gắn nhãn `Chọn 2` / `Chọn 3`.
  Phải chọn **đúng và đủ** mới được tính điểm.
- **Câu dạng Lab** (26 câu, nhãn `LAB`): là bài thao tác trên Azure portal, không phải trắc nghiệm.
  Chỉ có một "đáp án" là các bước thực hiện — dùng để đọc hiểu quy trình, không tính vào tỷ lệ đúng/sai.
- Câu hỏi trong bộ này có một số câu trùng nội dung nhưng khác bộ đáp án (do đề gốc như vậy) — giữ nguyên
  theo nguồn để không làm sai lệch dữ liệu.
- Tiến độ, thống kê đúng/sai và danh sách ⭐ được lưu trong `localStorage` của trình duyệt.
  Xoá dữ liệu trình duyệt sẽ mất tiến độ. Để reset thủ công, mở DevTools Console và chạy:
  ```js
  localStorage.removeItem('az500.v1')
  ```

## Cập nhật câu hỏi mới từ nguồn

Repo nguồn thỉnh thoảng được bổ sung/sửa câu hỏi. Để đồng bộ lại (cần Node 18+):

```bash
node update-questions.js
```

Script sẽ tải lại `README.md` từ GitHub, phân tích thành `questions.json` + `questions-data.js`,
và tải về những hình ảnh còn thiếu. Nó cảnh báo nếu có câu nào thiếu đáp án.

## Cấu trúc file

```
index.html            # Giao diện
styles.css            # Theme sáng/tối
app.js                # Toàn bộ logic (tra cứu, luyện tập, thi thử) — không phụ thuộc thư viện ngoài
questions-data.js     # Dữ liệu nhúng dạng JS (để chạy được qua file://)
questions.json        # Cùng dữ liệu, dạng JSON thuần nếu bạn muốn dùng cho việc khác
images/               # 217 hình ảnh minh hoạ
update-questions.js   # Script đồng bộ lại từ GitHub
```

### Cấu trúc dữ liệu (`questions.json`)

```json
{
  "source": "https://github.com/Ditectrev/...",
  "count": 308,
  "questions": [
    {
      "id": 42,
      "question": "…",
      "images": ["images/question42_1.jpg"],
      "options": [{ "text": "…", "correct": true, "images": [] }],
      "multi": false,
      "correctCount": 1,
      "type": "choice"
    }
  ]
}
```

## Nguồn

Câu hỏi và hình ảnh lấy từ repo cộng đồng mã nguồn mở
[Ditectrev/Microsoft-Azure-AZ-500-…-Questions-Answers](https://github.com/Ditectrev/Microsoft-Azure-AZ-500-Azure-Security-Engineer-Practice-Tests-Exams-Questions-Answers).
App này chỉ là lớp giao diện để tra cứu tiện hơn — nếu thấy hữu ích, hãy ⭐ hoặc hỗ trợ tác giả gốc.
Bản EPUB/PDF và phần giải thích chi tiết cho từng câu là nội dung trả phí của họ, không có trong repo.

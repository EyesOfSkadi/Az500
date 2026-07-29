/* ============================================================================
 * corrections.js — Danh sách đáp án tự sửa
 * ----------------------------------------------------------------------------
 * Bộ đề gốc do cộng đồng đóng góp nên có một số câu sai đáp án. File này ghi
 * lại các câu đã kiểm chứng và sửa lại; app tự áp dụng khi hiển thị và gắn
 * nhãn "⚠ Đã sửa" kèm ghi chú.
 *
 * File này KHÔNG bị ghi đè khi chạy `node update-questions.js`.
 *
 * Cách thêm một câu sửa:
 *
 *   {
 *     id: 32,                       // số câu trong app
 *     verify: "một đoạn ngắn của đề",// dùng để phát hiện đề gốc đã thay đổi
 *     correct: ["đoạn text của lựa chọn đúng"],  // khớp theo chuỗi con, không
 *                                   // dùng chỉ số, để không bị lệch nếu upstream
 *                                   // đảo thứ tự lựa chọn. Nhiều phần tử = nhiều
 *                                   // đáp án đúng. Bỏ trống nếu chỉ muốn ghi chú.
 *     answer: "đáp án đúng thật sự", // dùng khi KHÔNG lựa chọn nào đúng hoàn toàn
 *     note: "giải thích vì sao"      // hỗ trợ **in đậm** và xuống dòng
 *   }
 *
 * Lưu ý: `id` được đánh theo thứ tự xuất hiện trong README gốc. Nếu upstream
 * chèn thêm câu ở giữa, id sẽ lệch — khi đó `verify` sẽ không khớp và app in
 * cảnh báo ra Console thay vì âm thầm sửa sai câu.
 *
 * TỰ ĐỘNG PUSH: mỗi lần file này được sửa qua Claude Code, hook PostToolUse
 * trong .claude/settings.json gọi `sync-corrections.js` để tự commit và push
 * lên origin/main. Nếu bạn sửa bằng editor khác, chạy tay:
 *
 *     node sync-corrections.js --force
 * ==========================================================================*/

window.CORRECTIONS = [
  {
    id: 32,
    verify: 'provide User1 with the ability to manage and view costs for the resources across all three subscriptions',
    correct: ['Box 1: Create a management group. Box 2: Assign User1 the Cost Management Contributor role'],
    answer: 'Box 1: Create a management group. → Box 2: Add the three subscriptions to the management group. → Box 3: Assign User1 the Cost Management Contributor role for the management group.',
    note:
      '**Bộ đề gốc đánh dấu sai.** Thực tế không có phương án nào đúng hoàn toàn; ' +
      'phương án được chọn ở đây là gần đúng nhất.\n\n' +
      '**Đáp án bộ đề gốc chọn:** "Cost Management Contributor → Global administrator → Add 3 subscriptions". Sai vì hai lẽ: ' +
      '(1) Global administrator là role của Microsoft Entra ID, không phải Azure RBAC, nên không cấp quyền cost management — ' +
      'đồng thời vi phạm trắng trợn yêu cầu least privilege mà đề nêu rõ; ' +
      '(2) thứ tự bất khả thi vì gán role cho một management group chưa được tạo, và bước "Create a management group" bị bỏ hoàn toàn.\n\n' +
      '**Vì sao phương án này gần đúng nhất:** Box 1 và Box 2 đã chính xác. Riêng Box 3 bị lặp lại y nguyên Box 1 — ' +
      'gần như chắc chắn là lỗi copy-paste khi tác giả nhập đề; Box 3 lẽ ra phải là ' +
      '"Add the three subscriptions to the management group".\n\n' +
      '**Kiến thức cần nhớ:** cần một scope bao trên nhiều subscription → dùng **management group**, ' +
      'RBAC gán ở scope này sẽ kế thừa xuống mọi subscription con. ' +
      'Role least-privilege thoả cả "manage" lẫn "view" chi phí là **Cost Management Contributor** ' +
      '(nếu đề chỉ yêu cầu "view" thì mới là Cost Management Reader). ' +
      'Về vận hành, thứ tự gán role trước hay thêm subscription trước đều được, vì RBAC ở scope ' +
      'management group tự kế thừa cho subscription được thêm vào sau.',
  },
];

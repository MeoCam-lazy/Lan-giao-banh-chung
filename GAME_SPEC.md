# 🏮 GAME_SPEC.md — TẾT DÂN GIAN REMIX (SHIPPER MÚA LÂN 3D)

- **Chủ đề cuộc thi**: DÂN GIAN REMIX (*IT Game Jam with AI 2026*)
- **Nền tảng**: Web 3D Three.js (`three@0.180.0`) + Polyfork `Little Tokyo Kit` + Procedural Web Audio API.

## 1. Năm Trụ Cột Thiết Kế
1. **Player Fantasy & Hook**: Sáng 30 Tết (`23:50`), nữ sinh Lan đạp xe xuyên khu phố hiện đại được trang trí rực rỡ sắc Tết Việt (đèn lồng đỏ, hoa mai/đào, cổng chúc mừng năm mới) để giao lễ vật dân gian cho kịp Giao Thừa!
2. **Primary Goal & Pressure**: Đếm ngược `23:50 -> 00:00` (tua nhanh thành 90 giây). Cần giao **Bánh Chưng**, **Cành Mai/Đào**, **Bao Lì Xì**, **Đèn Lồng** tới 4 nhà trước khi hết giờ.
3. **Defining Twist (Điểm Sáng Tạo Remix)**:
   - **Con Múa Lân 3D nhảy múa dọc phố**: Có 2 Đoàn Lân (Lân Đỏ & Lân Vàng) nhún nhảy theo nhịp trống. Chạy gần Lân và bấm **`Space` (Lì xì / Gõ trống)** sẽ kích hoạt **Phúc Lộc Tết** (hồi 100% độ tươi lễ vật + bắn pháo hoa + `x2` điểm trong 8 giây!).
   - **Đánh đổi**: Né Taxi/Xe tải trên đường (đụng xe bị bật lại & rụng/hỏng lễ vật).
4. **Core Loop & Early Win (10 giây đầu)**: Đi bộ từ nhà ra xe đạp (`ON_FOOT`) $\rightarrow$ Leo lên xe (`ON_BIKE`) $\rightarrow$ Ghé Sảnh Tết lấy lễ vật chở sau yên $\rightarrow$ Giao tới nhà có cột sáng & bắn pháo hoa/trái tim!
5. **Bảng Màu Chủ Đạo**: Đỏ Son (`#E11D48`), Vàng Mai (`#FACC15`), Xanh Bánh Chưng (`#16A34A`), Kem Ấm (`#FFFBEB`), Nền Đêm Giao Thừa (`#0F172A`).

## 2. Kiến Trúc Module (< 400 dòng/file)
- `index.html` & `style.css`: Giao diện HUD Tết, Minimap bản đồ phố, hiệu ứng pháo hoa/chúc mừng.
- `src/audio.js`: Nhạc nền Ngũ Cung Tết Remix EDM + Tiếng Trống Múa Lân + Chuông xe đạp + Pháo nổ.
- `src/tet_props.js`: Mô hình 3D **Con Múa Lân** (đầu lân, mắt, râu, thân vải uốn sóng `sin`), **Bánh Chưng / Cành Đào / Bao Lì Xì**, Đèn lồng đỏ & Pháo hoa 3D.
- `src/game.js`: Vòng lặp game, `buildKit` + `stage('dusk')`, lái xe mượt, va chạm vật lý, tương tác Lân, phím `F2` (Cao trào `23:58`), `R` (Chơi lại), `M` (Âm thanh).

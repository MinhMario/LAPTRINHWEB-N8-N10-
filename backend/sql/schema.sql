-- schema.sql : CSDL website quản lý hồ sơ sinh viên (MySQL 8, thiết kế v2 - 9 bảng)
-- Tài khoản mẫu:
--   admin        / 123456     (1 admin duy nhất)
--   B24DTCN001   / Ptit@2026  (sinh viên, KHÔNG bị buộc đổi mật khẩu)
--   B24DTCN002..020 / Ptit@2026 (sinh viên, must_change_password = 1)
DROP DATABASE IF EXISTS student_db;
CREATE DATABASE student_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_db;
SET NAMES utf8mb4;

-- 1. users
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','student') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
);

-- 2. majors
CREATE TABLE majors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_majors_code (code),
  UNIQUE KEY uq_majors_name (name)
);

-- 3. classes
CREATE TABLE classes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  major_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_code (code),
  CONSTRAINT fk_classes_major FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE RESTRICT
);

-- 4. students
CREATE TABLE students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  student_code VARCHAR(20) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender ENUM('Nam','Nữ','Khác') NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address VARCHAR(255) NULL,
  avatar_filename VARCHAR(255) NULL,
  hobbies TEXT NULL,
  class_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_user (user_id),
  UNIQUE KEY uq_students_code (student_code),
  UNIQUE KEY uq_students_email (email),
  KEY idx_students_class (class_id),
  KEY idx_students_created (created_at),
  KEY idx_students_name (full_name),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
);

-- 5. skills
CREATE TABLE skills (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
);

-- 6. student_skills
CREATE TABLE student_skills (
  student_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  level TINYINT UNSIGNED NOT NULL DEFAULT 3,
  PRIMARY KEY (student_id, skill_id),
  CONSTRAINT chk_student_skills_level CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- 7. social_links
CREATE TABLE social_links (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  platform VARCHAR(30) NOT NULL,
  url VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_social_student_platform (student_id, platform),
  CONSTRAINT fk_social_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 8. profile_update_requests
CREATE TABLE profile_update_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  new_data JSON NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  -- Chỉ có giá trị 1 khi status='pending', NULL khi đã xử lý; cặp (student_id, pending_flag)
  -- UNIQUE bảo đảm mỗi sinh viên chỉ có tối đa 1 yêu cầu chờ duyệt.
  -- Ghi giá trị này ở tầng ứng dụng (request_service) để chạy được trên cả MySQL và SQLite.
  pending_flag TINYINT NULL,
  reviewed_by INT UNSIGNED NULL,
  reject_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_one_pending_per_student (student_id, pending_flag),
  CONSTRAINT fk_pur_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_pur_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 9. audit_logs
CREATE TABLE audit_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  action ENUM('create','update','delete','approve','reject') NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id INT UNSIGNED NOT NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_target (target_type, target_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================  DỮ LIỆU MẪU (1 admin + 20 sinh viên)  =====================

INSERT INTO users (id, username, password_hash, role, is_active, must_change_password) VALUES
(1,'admin','$2b$12$nIz/0HqlstmpDpW5U6HUzemlTRHh0025YmpHRb73WA9DzqJM1h4Ze','admin',1,0),
(2,'B24DTCN001','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,0),
(3,'B24DTCN002','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(4,'B24DTCN003','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(5,'B24DTCN004','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(6,'B24DTCN005','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(7,'B24DTCN006','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(8,'B24DTCN007','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(9,'B24DTCN008','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(10,'B24DTCN009','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(11,'B24DTCN010','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(12,'B24DTCN011','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(13,'B24DTCN012','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(14,'B24DTCN013','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(15,'B24DTCN014','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(16,'B24DTCN015','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(17,'B24DTCN016','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(18,'B24DTCN017','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(19,'B24DTCN018','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(20,'B24DTCN019','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(21,'B24DTCN020','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',1,1),
(22,'B24DTCN099_deleted_22','$2b$12$/tntKWkKfXmU0kskH5toY.iKRk5zW1fCx9DSKj.sO2NnQwJ3awK0u','student',0,0);

INSERT INTO majors (id, code, name) VALUES
(1,'CNTT','Công nghệ thông tin'),
(2,'DPT','Công nghệ đa phương tiện'),
(3,'ATTT','An toàn thông tin'),
(4,'KHMT','Khoa học máy tính');

INSERT INTO classes (id, code, name, major_id) VALUES
(1,'D24CNTT01','Công nghệ thông tin 1',1),
(2,'D24CNTT02','Công nghệ thông tin 2',1),
(3,'D24DPT01','Đa phương tiện 1',2),
(4,'D24ATTT01','An toàn thông tin 1',3),
(5,'D24KHMT01','Khoa học máy tính 1',4);

INSERT INTO students (id, user_id, student_code, full_name, birth_date, gender, email, phone, address, avatar_filename, hobbies, class_id, created_at) VALUES
(1,2,'B24DTCN001','Nguyễn Văn An','2006-09-16','Nam','b24dtcn001@stu.ptit.edu.vn','0978778932','Hà Đông, Hà Nội',NULL,'Nghe nhạc, chụp ảnh',1,'2026-10-02 08:01:00'),
(2,3,'B24DTCN002','Trần Thị Bình','2006-12-21','Nữ','b24dtcn002@stu.ptit.edu.vn','0992174218','Thanh Xuân, Hà Nội',NULL,'Bóng đá, chạy bộ',2,'2026-10-03 08:02:00'),
(3,4,'B24DTCN003','Lê Hoàng Cường','2006-09-03','Nam','b24dtcn003@stu.ptit.edu.vn','0909679290','Nam Từ Liêm, Hà Nội',NULL,'Chơi game, lập trình',3,'2026-10-04 08:03:00'),
(4,5,'B24DTCN004','Phạm Minh Đức','2006-08-19','Nam','b24dtcn004@stu.ptit.edu.vn','0900339075','Cầu Giấy, Hà Nội',NULL,'Du lịch, nấu ăn',4,'2026-10-05 08:04:00'),
(5,6,'B24DTCN005','Hoàng Thị Giang','2006-11-09','Nữ','b24dtcn005@stu.ptit.edu.vn','0938347017','Hà Đông, Hà Nội',NULL,'Vẽ, xem phim',5,'2026-10-06 08:05:00'),
(6,7,'B24DTCN006','Vũ Quang Huy','2006-01-03','Nam','b24dtcn006@stu.ptit.edu.vn','0968145384','Thanh Xuân, Hà Nội',NULL,'Đọc sách, chơi cờ vua',1,'2026-10-07 08:06:00'),
(7,8,'B24DTCN007','Đặng Thị Lan','2006-11-01','Nữ','b24dtcn007@stu.ptit.edu.vn','0991614610','Nam Từ Liêm, Hà Nội',NULL,'Nghe nhạc, chụp ảnh',2,'2026-10-08 08:07:00'),
(8,9,'B24DTCN008','Bùi Tuấn Kiệt','2006-10-21','Nam','b24dtcn008@stu.ptit.edu.vn','0933076661',NULL,NULL,'Bóng đá, chạy bộ',3,'2026-10-09 08:08:00'),
(9,10,'B24DTCN009','Ngô Thanh Mai','2006-02-05','Nữ','b24dtcn009@stu.ptit.edu.vn','0934514506','Hà Đông, Hà Nội',NULL,'Chơi game, lập trình',4,'2026-10-10 08:09:00'),
(10,11,'B24DTCN010','Đỗ Văn Nam','2006-04-15','Nam','b24dtcn010@stu.ptit.edu.vn','0931007728','Thanh Xuân, Hà Nội',NULL,'Du lịch, nấu ăn',5,'2026-10-11 08:10:00'),
(11,12,'B24DTCN011','Dương Thị Oanh','2006-04-01','Nữ','b24dtcn011@stu.ptit.edu.vn','0983266166','Nam Từ Liêm, Hà Nội',NULL,'Vẽ, xem phim',1,'2026-10-12 08:11:00'),
(12,13,'B24DTCN012','Lý Gia Phúc','2006-11-19','Nam','b24dtcn012@stu.ptit.edu.vn','0949403269',NULL,NULL,'Đọc sách, chơi cờ vua',2,'2026-10-13 08:12:00'),
(13,14,'B24DTCN013','Phan Thị Quỳnh','2006-06-27','Nữ','b24dtcn013@stu.ptit.edu.vn','0910237409','Hà Đông, Hà Nội',NULL,'Nghe nhạc, chụp ảnh',3,'2026-10-14 08:13:00'),
(14,15,'B24DTCN014','Trịnh Đức Thắng','2006-01-20','Nam','b24dtcn014@stu.ptit.edu.vn','0946111393','Thanh Xuân, Hà Nội',NULL,'Bóng đá, chạy bộ',4,'2026-10-15 08:14:00'),
(15,16,'B24DTCN015','Nguyễn Thị Thu Trang','2006-03-28','Nữ','b24dtcn015@stu.ptit.edu.vn','0955972979','Nam Từ Liêm, Hà Nội',NULL,'Chơi game, lập trình',5,'2026-10-16 08:15:00'),
(16,17,'B24DTCN016','Lê Văn Tùng','2006-03-24','Nam','b24dtcn016@stu.ptit.edu.vn','0962243933',NULL,NULL,'Du lịch, nấu ăn',1,'2026-10-17 08:16:00'),
(17,18,'B24DTCN017','Trần Hải Yến','2006-02-04','Nữ','b24dtcn017@stu.ptit.edu.vn','0983679160','Hà Đông, Hà Nội',NULL,'Vẽ, xem phim',2,'2026-10-18 08:17:00'),
(18,19,'B24DTCN018','Hồ Anh Khoa','2006-08-10','Nam','b24dtcn018@stu.ptit.edu.vn','0908436469','Thanh Xuân, Hà Nội',NULL,'Đọc sách, chơi cờ vua',3,'2026-10-19 08:18:00'),
(19,20,'B24DTCN019','Nguyễn Hoàng Long Vũ Minh Quân Thiên Phúc','2006-10-03','Nữ','b24dtcn019@stu.ptit.edu.vn','0982123789','Nam Từ Liêm, Hà Nội',NULL,'Nghe nhạc, chụp ảnh',4,'2026-10-20 08:19:00'),
(20,21,'B24DTCN020','Đinh Công Danh','2006-04-02','Nam','b24dtcn020@stu.ptit.edu.vn','0943301467',NULL,NULL,'Bóng đá, chạy bộ',5,'2026-10-21 08:20:00');

INSERT INTO skills (id, name) VALUES
(1,'Python'),
(2,'SQL'),
(3,'HTML/CSS'),
(4,'JavaScript'),
(5,'PHP'),
(6,'Java'),
(7,'Git'),
(8,'Figma'),
(9,'Photoshop'),
(10,'Tiếng Anh');

INSERT INTO student_skills (student_id, skill_id, level) VALUES
(1,10,1),(1,1,1),(1,2,3),(1,9,4),
(2,7,4),(2,8,5),(2,9,1),
(3,1,5),(3,2,5),(3,3,1),(3,4,3),(3,5,5),(3,6,1),(3,7,4),(3,8,1),
(4,2,5),(4,8,4),
(6,1,2),(6,6,5),(6,5,2),
(7,6,4),(7,8,2),
(8,7,4),(8,5,2),(8,4,2),
(9,4,2),(9,6,4),(9,10,3),(9,2,1),
(10,5,2),
(11,8,4),
(13,4,5),(13,7,4),(13,9,3),
(14,6,5),(14,2,1),(14,1,3),(14,3,5),
(15,5,4),(15,1,4),(15,3,2),
(16,5,2),
(17,1,4),(17,2,1),
(18,2,4),(18,4,3),(18,9,2),
(19,8,5);

INSERT INTO social_links (student_id, platform, url) VALUES
(1,'Facebook','https://facebook.com/b24dtcn001'),
(1,'GitHub','https://github.com/b24dtcn001'),
(2,'Facebook','https://facebook.com/b24dtcn002'),
(3,'GitHub','https://github.com/b24dtcn003'),
(4,'Facebook','https://facebook.com/b24dtcn004'),
(5,'Facebook','https://facebook.com/b24dtcn005'),
(5,'GitHub','https://github.com/b24dtcn005'),
(5,'LinkedIn','https://linkedin.com/in/b24dtcn005'),
(7,'Facebook','https://facebook.com/b24dtcn007'),
(7,'GitHub','https://github.com/b24dtcn007'),
(8,'Facebook','https://facebook.com/b24dtcn008'),
(9,'GitHub','https://github.com/b24dtcn009'),
(10,'Facebook','https://facebook.com/b24dtcn010'),
(10,'LinkedIn','https://linkedin.com/in/b24dtcn010'),
(11,'Facebook','https://facebook.com/b24dtcn011'),
(11,'GitHub','https://github.com/b24dtcn011'),
(13,'Facebook','https://facebook.com/b24dtcn013'),
(13,'GitHub','https://github.com/b24dtcn013'),
(14,'Facebook','https://facebook.com/b24dtcn014'),
(15,'GitHub','https://github.com/b24dtcn015'),
(15,'LinkedIn','https://linkedin.com/in/b24dtcn015'),
(16,'Facebook','https://facebook.com/b24dtcn016'),
(17,'Facebook','https://facebook.com/b24dtcn017'),
(17,'GitHub','https://github.com/b24dtcn017'),
(19,'Facebook','https://facebook.com/b24dtcn019'),
(19,'GitHub','https://github.com/b24dtcn019'),
(20,'Facebook','https://facebook.com/b24dtcn020'),
(20,'LinkedIn','https://linkedin.com/in/b24dtcn020');

INSERT INTO profile_update_requests (student_id, new_data, status, reviewed_by, reject_reason, created_at, reviewed_at) VALUES
(2,'{"phone": "0987654321", "hobbies": "Vẽ, đọc truyện", "skills": [{"name": "Python", "level": 4}, {"name": "SQL", "level": 3}], "social_links": [{"platform": "GitHub", "url": "https://github.com/b24dtcn002"}]}','pending',NULL,NULL,'2026-11-14 09:00:00',NULL),
(3,'{"phone": "12345"}','rejected',1,'Số điện thoại phải gồm 10 chữ số','2026-11-10 14:00:00','2026-11-11 08:30:00'),
(4,'{"address": "Cầu Giấy, Hà Nội"}','approved',1,NULL,'2026-11-05 10:00:00','2026-11-06 09:15:00');

INSERT INTO audit_logs (user_id, action, target_type, target_id, old_data, new_data, created_at) VALUES
(1,'create','student',1,NULL,'{"student_code": "B24DTCN001", "full_name": "Nguyễn Văn An", "class": "D24CNTT01"}','2026-10-02 08:01:00'),
(1,'approve','student',4,'{"address": null}','{"address": "Cầu Giấy, Hà Nội"}','2026-11-06 09:15:00'),
(1,'reject','student',3,NULL,'{"reject_reason": "Số điện thoại phải gồm 10 chữ số"}','2026-11-11 08:30:00'),
(1,'delete','student',99,'{"student_code": "B24DTCN099", "full_name": "Nguyễn Văn Z", "class": "D24CNTT01", "skills": [{"name": "Python", "level": 3}], "social_links": [{"platform": "GitHub", "url": "https://github.com/b24dtcn099"}]}',NULL,'2026-11-12 16:20:00');

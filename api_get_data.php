<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    // 1. ดึงข้อมูลรายชื่อพระภิกษุสงฆ์ทั้งหมด (พร้อม map คีย์ตามที่หน้าบ้านต้องการ)
    $stmt_monks = $pdo->query("
        SELECT 
          id, person_code AS personCode, image, title, first_name AS firstName, last_name AS lastName, chaya, nickname,
          id_card AS idCard, birth_date AS birthDate, phone, phone_secondary AS phoneSecondary, line_id AS lineId,
          ordination_date AS ordinationDate, upajjhaya, vassa, age,
          residing_temple AS residingTemple, affiliated_temple AS affiliatedTemple,
          subdistrict, district, province, region,
          temple_position AS templePosition, sangha_position AS sanghaPosition,
          upajjhaya_status AS upajjhayaStatus, upajjhaya_code AS upajjhayaCode,
          other_position AS otherPosition, rajathinnanam, rank_class AS rankClass,
          faction, education, dhamma_education AS dhammaEducation, pali_education AS paliEducation, pali_grade AS paliGrade,
          zip_code AS zipCode, remarks, data_source AS dataSource
        FROM monks 
        ORDER BY id ASC
    ");
    $monks_list = $stmt_monks->fetchAll();

    // 2. ดึงรายชื่อวัดทั้งหมด
    $stmt_temples = $pdo->query("
        SELECT id, name, type, district, subdistrict, province, abbot 
        FROM temples 
        ORDER BY name ASC
    ");
    $temples_list = $stmt_temples->fetchAll();

    // 3. ดึงรายการปฏิทินกิจกรรมทั้งหมด
    $stmt_events = $pdo->query("
        SELECT id, title, date, type, province, description 
        FROM events 
        ORDER BY id ASC
    ");
    $events_list = $stmt_events->fetchAll();

    // ตอบกลับหน้าบ้านเป็นแบบโครงสร้างแบน (Flat Structure) เพื่อให้หน้าบ้านจัดการแบ่งจังหวัดได้อย่างมีประสิทธิภาพ
    echo json_encode([
        'status' => 'success',
        'monks' => $monks_list,
        'temples' => $temples_list,
        'events' => $events_list
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' . $e->getMessage()
    ]);
}
?>

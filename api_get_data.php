<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    // 1. ดึงสถิติต่างๆ
    $stmt_monks_count = $pdo->query("SELECT COUNT(*) FROM monks");
    $total_monks = (int)$stmt_monks_count->fetchColumn();

    $stmt_temples_count = $pdo->query("SELECT COUNT(*) FROM temples");
    $total_temples = (int)$stmt_temples_count->fetchColumn();

    $stmt_events_count = $pdo->query("SELECT COUNT(*) FROM events");
    $total_events = (int)$stmt_events_count->fetchColumn();

    $stmt_dist_count = $pdo->query("SELECT COUNT(DISTINCT district) FROM temples WHERE district != ''");
    $total_districts = (int)$stmt_dist_count->fetchColumn();
    if ($total_districts === 0) {
        $total_districts = 16; // ค่านิยมตั้งต้นถ้าฐานข้อมูลยังไม่มีวัด
    }

    // 2. ดึงข้อมูลรายชื่อพระภิกษุสงฆ์ทั้งหมด
    $stmt_monks = $pdo->query("
        SELECT 
          id, image, title, first_name AS firstName, last_name AS lastName, chaya, nickname,
          id_card AS idCard, birth_date AS birthDate, phone, line_id AS lineId,
          ordination_date AS ordinationDate, upajjhaya, vassa, age,
          residing_temple AS residingTemple, affiliated_temple AS affiliatedTemple,
          subdistrict, district, province, region,
          temple_position AS templePosition, sangha_position AS sanghaPosition,
          upajjhaya_status AS upajjhayaStatus, upajjhaya_code AS upajjhayaCode,
          other_position AS otherPosition, rajathinnanam, rank_class AS rankClass,
          faction, education, dhamma_education AS dhammaEducation, pali_education AS paliEducation,
          zip_code AS zipCode, remarks
        FROM monks 
        ORDER BY id ASC
    ");
    $monks_list = $stmt_monks->fetchAll();

    // 3. ดึงรายชื่อวัดทั้งหมด
    $stmt_temples = $pdo->query("SELECT id, name, type, district, subdistrict, abbot FROM temples ORDER BY name ASC");
    $temples_list = $stmt_temples->fetchAll();

    // 4. ดึงรายการปฏิทินกิจกรรม
    $stmt_events = $pdo->query("SELECT id, title, date, type, description FROM events ORDER BY id ASC");
    $events_list = $stmt_events->fetchAll();

    // 5. ดึงเขตอำเภอและตำบลแบบสัมพันธ์กัน (Cascading Districts)
    $stmt_dist_sub = $pdo->query("
        SELECT DISTINCT district, subdistrict 
        FROM temples 
        WHERE district != '' AND subdistrict != '' 
        ORDER BY district ASC, subdistrict ASC
    ");
    $dist_sub_raw = $stmt_dist_sub->fetchAll();
    
    $districts_grouped = [];
    foreach ($dist_sub_raw as $row) {
        $d = $row['district'];
        $s = $row['subdistrict'];
        if (!isset($districts_grouped[$d])) {
            $districts_grouped[$d] = [];
        }
        if (!in_array($s, $districts_grouped[$d], true)) {
            $districts_grouped[$d][] = $s;
        }
    }

    $districts_list = [];
    foreach ($districts_grouped as $d_name => $subdistricts) {
        $districts_list[] = [
            'name' => $d_name,
            'subdistricts' => $subdistricts
        ];
    }

    // กรณีไม่มีข้อมูลวัดเลย ให้มีค่าพื้นฐานสำหรับทดสอบระบบ
    if (empty($districts_list)) {
        $districts_list = [
            [
                'name' => "อ.พระนครศรีอยุธยา",
                'subdistricts' => ["ประตูชัย", "กะมัง", "หอรัตนไชย", "หัวรอ", "บ้านป้อม", "คลองสวนพลู"]
            ]
        ];
    }

    // 6. ดึงข้อมูลโครงสร้างการปกครอง (Hierarchy)
    // ค้นหาเจ้าคณะจังหวัด (จจ.%)
    $stmt_gov = $pdo->prepare("SELECT title, residing_temple, district, subdistrict, rank_class, remarks FROM monks WHERE sangha_position LIKE 'จจ.%' LIMIT 1");
    $stmt_gov->execute();
    $gov_row = $stmt_gov->fetch();
    
    if ($gov_row) {
        $governor = [
            'name' => $gov_row['title'],
            'position' => "เจ้าคณะจังหวัดพระนครศรีอยุธยา",
            'temple' => $gov_row['residing_temple'],
            'district' => $gov_row['district'],
            'subdistrict' => $gov_row['subdistrict'],
            'rank' => $gov_row['rank_class'] ? $gov_row['rank_class'] : "พระราชาคณะ",
            'imageColor' => "from-amber-700 to-amber-900",
            'details' => $gov_row['remarks'] ? $gov_row['remarks'] : "เจ้าคณะจังหวัดพระนครศรีอยุธยา"
        ];
    } else {
        // Fallback default
        $governor = [
            'name' => "พระธรรมรัตนมงคล",
            'position' => "เจ้าคณะจังหวัดพระนครศรีอยุธยา",
            'temple' => "วัดพนัญเชิงวรวิหาร",
            'district' => "อ.พระนครศรีอยุธยา",
            'subdistrict' => "คลองสวนพลู",
            'rank' => "พระราชาคณะชั้นธรรม",
            'imageColor' => "from-amber-700 to-amber-900",
            'details' => "ดูแลปกครองคณะสงฆ์ในเขตปกครองจังหวัดพระนครศรีอยุธยา"
        ];
    }

    // ค้นหารองเจ้าคณะจังหวัด (รจจ.%)
    $stmt_deps = $pdo->prepare("SELECT title, residing_temple, district, subdistrict, rank_class, remarks FROM monks WHERE sangha_position LIKE 'รจจ.%' ORDER BY id ASC");
    $stmt_deps->execute();
    $deps_rows = $stmt_deps->fetchAll();
    
    $deputies = [];
    foreach ($deps_rows as $i => $dep_row) {
        $deputies[] = [
            'name' => $dep_row['title'],
            'position' => "รองเจ้าคณะจังหวัดพระนครศรีอยุธยา รูปที่ " . ($i + 1),
            'temple' => $dep_row['residing_temple'],
            'district' => $dep_row['district'],
            'subdistrict' => $dep_row['subdistrict'],
            'rank' => $dep_row['rank_class'] ? $dep_row['rank_class'] : "พระราชาคณะ",
            'imageColor' => "from-amber-600 to-amber-800",
            'details' => $dep_row['remarks'] ? $dep_row['remarks'] : "รองเจ้าคณะจังหวัดพระนครศรีอยุธยา"
        ];
    }

    // Fallback รองเจ้าคณะจังหวัดถ้ายังไม่พบคู่มือ
    if (empty($deputies)) {
        $deputies = [
            [
                'name' => "พระราชพัฒนาภรณ์",
                'position' => "รองเจ้าคณะจังหวัดพระนครศรีอยุธยา รูปที่ 1",
                'temple' => "วัดท่าการ้อง",
                'district' => "อ.พระนครศรีอยุธยา",
                'subdistrict' => "บ้านป้อม",
                'rank' => "พระราชาคณะชั้นราช",
                'imageColor' => "from-amber-600 to-amber-800",
                'details' => "ดูแลรับผิดชอบงานฝ่ายสาธารณูปการจังหวัด"
            ]
        ];
    }

    // ประกอบร่าง JSON ตอบกลับหน้าบ้าน
    echo json_encode([
        'status' => 'success',
        'provinceName' => "จังหวัดพระนครศรีอยุธยา",
        'statistics' => [
            'totalTemples' => $total_temples,
            'totalMonks' => $total_monks,
            'totalNovices' => 1250, // ค่าจำลองสามเณร
            'totalDistricts' => $total_districts
        ],
        'districts' => $districts_list,
        'hierarchy' => [
            'governor' => $governor,
            'deputies' => $deputies
        ],
        'monks' => $monks_list,
        'temples' => $temples_list,
        'events' => $events_list
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' . $e->getMessage()
    ]);
}
?>

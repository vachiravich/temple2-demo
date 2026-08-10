<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    if ($action === 'save_monk') {
        $id = $data['id'] ?? '';
        
        $fields = [
            'person_code' => $data['personCode'] ?? '',
            'image' => $data['image'] ?? '',
            'title' => $data['title'] ?? '',
            'first_name' => $data['firstName'] ?? '',
            'last_name' => $data['lastName'] ?? '',
            'chaya' => $data['chaya'] ?? '',
            'nickname' => $data['nickname'] ?? '',
            'id_card' => $data['idCard'] ?? '',
            'birth_date' => $data['birthDate'] ?? '',
            'phone' => $data['phone'] ?? '',
            'phone_secondary' => $data['phoneSecondary'] ?? '',
            'line_id' => $data['lineId'] ?? '',
            'ordination_date' => $data['ordinationDate'] ?? '',
            'upajjhaya' => $data['upajjhaya'] ?? '',
            'vassa' => (int)($data['vassa'] ?? 0),
            'age' => (int)($data['age'] ?? 0),
            'residing_temple' => $data['residingTemple'] ?? '',
            'affiliated_temple' => $data['affiliatedTemple'] ?? '',
            'subdistrict' => $data['subdistrict'] ?? '',
            'district' => $data['district'] ?? '',
            'province' => $data['province'] ?? 'พระนครศรีอยุธยา',
            'region' => $data['region'] ?? 'ภาค 2',
            'temple_position' => $data['templePosition'] ?? '',
            'sangha_position' => $data['sanghaPosition'] ?? '',
            'upajjhaya_status' => $data['upajjhayaStatus'] ?? '',
            'upajjhaya_code' => $data['upajjhayaCode'] ?? '',
            'other_position' => $data['otherPosition'] ?? '',
            'rajathinnanam' => $data['rajathinnanam'] ?? '',
            'rank_class' => $data['rankClass'] ?? '',
            'faction' => $data['faction'] ?? 'มหานิกาย',
            'education' => $data['education'] ?? '',
            'dhamma_education' => $data['dhammaEducation'] ?? '',
            'pali_education' => $data['paliEducation'] ?? '',
            'pali_grade' => $data['paliGrade'] ?? '',
            'remarks' => $data['remarks'] ?? '',
            'data_source' => $data['dataSource'] ?? ''
        ];
        
        if (!empty($id) && is_numeric($id)) {
            // Update
            $sql = "UPDATE monks SET ";
            $parts = [];
            foreach ($fields as $col => $val) {
                $parts[] = "`$col` = :$col";
            }
            $sql .= implode(', ', $parts) . " WHERE id = :id";
            $fields['id'] = (int)$id;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'แก้ไขข้อมูลพระภิกษุสงฆ์เรียบร้อยแล้ว']);
        } else {
            // Insert
            $cols = array_keys($fields);
            $placeholders = array_map(fn($c) => ":$c", $cols);
            $sql = "INSERT INTO monks (" . implode(', ', array_map(fn($c) => "`$c`", $cols)) . ") VALUES (" . implode(', ', $placeholders) . ")";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'เพิ่มข้อมูลพระภิกษุสงฆ์เรียบร้อยแล้ว', 'newId' => $pdo->lastInsertId()]);
        }
    } 
    elseif ($action === 'delete_monk') {
        $id = $data['id'] ?? '';
        if (empty($id)) {
            throw new Exception("ไม่ระบุรหัสข้อมูล");
        }
        $stmt = $pdo->prepare("DELETE FROM monks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'success', 'message' => 'ลบข้อมูลเรียบร้อยแล้ว']);
    } 
    elseif ($action === 'save_temple') {
        $id = $data['id'] ?? '';
        $fields = [
            'name' => $data['name'] ?? '',
            'type' => $data['type'] ?? '',
            'district' => $data['district'] ?? '',
            'subdistrict' => $data['subdistrict'] ?? '',
            'province' => $data['province'] ?? 'พระนครศรีอยุธยา',
            'abbot' => $data['abbot'] ?? ''
        ];
        
        if (!empty($id) && is_numeric($id)) {
            $stmt = $pdo->prepare("UPDATE temples SET name = :name, type = :type, district = :district, subdistrict = :subdistrict, province = :province, abbot = :abbot WHERE id = :id");
            $fields['id'] = (int)$id;
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'แก้ไขข้อมูลวัดเรียบร้อยแล้ว']);
        } else {
            $stmt = $pdo->prepare("INSERT INTO temples (name, type, district, subdistrict, province, abbot) VALUES (:name, :type, :district, :subdistrict, :province, :abbot)");
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'เพิ่มข้อมูลวัดเรียบร้อยแล้ว', 'newId' => $pdo->lastInsertId()]);
        }
    } 
    elseif ($action === 'delete_temple') {
        $id = $data['id'] ?? '';
        if (empty($id)) {
            throw new Exception("ไม่ระบุรหัสข้อมูล");
        }
        $stmt = $pdo->prepare("DELETE FROM temples WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'success', 'message' => 'ลบข้อมูลวัดเรียบร้อยแล้ว']);
    } 
    elseif ($action === 'save_event') {
        $id = $data['id'] ?? '';
        $fields = [
            'title' => $data['title'] ?? '',
            'date' => $data['date'] ?? '',
            'type' => $data['type'] ?? '',
            'province' => $data['province'] ?? 'พระนครศรีอยุธยา',
            'description' => $data['description'] ?? ''
        ];
        
        if (!empty($id) && is_numeric($id)) {
            $stmt = $pdo->prepare("UPDATE events SET title = :title, date = :date, type = :type, province = :province, description = :description WHERE id = :id");
            $fields['id'] = (int)$id;
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'แก้ไขกิจกรรมเรียบร้อยแล้ว']);
        } else {
            $stmt = $pdo->prepare("INSERT INTO events (title, date, type, province, description) VALUES (:title, :date, :type, :province, :description)");
            $stmt->execute($fields);
            echo json_encode(['status' => 'success', 'message' => 'เพิ่มกิจกรรมเรียบร้อยแล้ว', 'newId' => $pdo->lastInsertId()]);
        }
    } 
    elseif ($action === 'delete_event') {
        $id = $data['id'] ?? '';
        if (empty($id)) {
            throw new Exception("ไม่ระบุรหัสข้อมูล");
        }
        $stmt = $pdo->prepare("DELETE FROM events WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'success', 'message' => 'ลบกิจกรรมเรียบร้อยแล้ว']);
    } 
    elseif ($action === 'reset_db') {
        $pdo->exec("TRUNCATE TABLE monks");
        $pdo->exec("TRUNCATE TABLE temples");
        $pdo->exec("TRUNCATE TABLE events");
        
        exec("python3 /Users/vichy/Sites/temple2/generate_inserts.py 2>&1", $out, $ret);
        if ($ret === 0) {
            $sql = file_get_contents('/Users/vichy/Sites/temple2/import_data.sql');
            $pdo->exec($sql);
            unlink('/Users/vichy/Sites/temple2/import_data.sql');
            echo json_encode(['status' => 'success', 'message' => 'รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้นเรียบร้อยแล้ว']);
        } else {
            echo json_encode([
                'status' => 'error', 
                'message' => 'ไม่สามารถรันตัวสร้างไฟล์ SQL ได้: ' . implode("\n", $out)
            ]);
        }
    } 
    else {
        throw new Exception("การทำงานไม่ถูกต้อง");
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ]);
}
?>

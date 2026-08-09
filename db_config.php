<?php
// กำหนดค่าการเชื่อมต่อฐานข้อมูลตามสภาพแวดล้อมระบบ (Localhost / Production Cloud Server)
if (
    php_sapi_name() === 'cli' ||
    (isset($_SERVER['SERVER_NAME']) && (
        strstr($_SERVER['SERVER_NAME'], 'photomerit.test') || 
        strstr($_SERVER['SERVER_NAME'], 'temple2.test') || 
        strstr($_SERVER['SERVER_NAME'], 'localhost') || 
        $_SERVER['SERVER_NAME'] === '127.0.0.1'
    ))
) {
    define("DB_HOST", "localhost");
    define("DBNAME", "temple2");
    define("DB_USER", "root");
    define("DB_PWD", "root");
} else {
    define("DB_HOST", "172.25.3.13");
    define("DBNAME", "temple2");
    define("DB_USER", "ctdmCloud");
    define("DB_PWD", "Ctdm.101072555+Cloud@user");
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DBNAME . ";charset=utf8mb4",
        DB_USER,
        DB_PWD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' . $e->getMessage()
    ]);
    exit;
}
?>

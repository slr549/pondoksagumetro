<?php
include_once("koneksi.php");

try {
    // ganti "Users" dengan nama tabel yang ada di database PostsgreSQL anda
    $stmt = $pdo->query("SELECT id, name, email, FROM users ORDER BY id DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($users);
} catch (PDOException $e) {
    echo json_encode(array("error" => $e->getMessage()));
}
?>
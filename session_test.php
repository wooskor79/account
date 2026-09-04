<?php
error_reporting(E_ALL);
ini_set("display_errors", 1);
session_save_path(__DIR__ . "/data/sessions");
session_start();
if (!isset($_SESSION["test_count"])) {
    $_SESSION["test_count"] = 0;
}
$_SESSION["test_count"]++;
echo "Session save path: " . session_save_path() . "<br>";
echo "Test count: " . $_SESSION["test_count"];
?>

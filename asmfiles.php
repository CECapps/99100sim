<?php
header('Content-Type: application/json');
echo json_encode(glob('asm/*.asm'), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

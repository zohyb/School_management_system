#!/usr/bin/env bash
# Sets up MySQL 8 for local development on Ubuntu.
# Usage: sudo bash scripts/setup-mysql.sh
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" mysql-server
service mysql start

mysql <<'SQL'
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'smsroot123';
CREATE DATABASE IF NOT EXISTS sms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sms'@'localhost' IDENTIFIED BY 'smspass123';
GRANT ALL PRIVILEGES ON sms.* TO 'sms'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "MySQL ready. Database 'sms' with user 'sms' / 'smspass123'."
echo "Next: cp server/.env.example server/.env && npm run db:migrate && npm run db:seed"

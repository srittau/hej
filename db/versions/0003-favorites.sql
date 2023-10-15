-- Schema: hej
-- Dialect: sqlite
-- Version: 3
-- API-Level: 1

ALTER TABLE notes ADD COLUMN favorite INTEGER NOT NULL DEFAULT FALSE;

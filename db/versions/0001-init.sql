-- Schema: hej
-- Dialect: sqlite
-- Version: 1
-- API-Level: 1

CREATE TABLE IF NOT EXISTS notes(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    last_changed TEXT NOT NULL  -- YYYY-MM-DDTHH:MM:SSZ
);

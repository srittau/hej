-- Schema: hej
-- Dialect: sqlite
-- Version: 2
-- API-Level: 1

CREATE TABLE IF NOT EXISTS notes_new(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- YYYY-MM-DD HH:MM:SS
    last_changed TEXT NOT NULL  -- YYYY-MM-DDTHH:MM:SSZ
);
INSERT INTO notes_new(uuid, title, text, last_changed)
    SELECT uuid, title, text, last_changed FROM notes;
UPDATE notes_new SET creation_date = '2000-01-01 00:00:00';
DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;

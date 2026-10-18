-- Schema: hej
-- Dialect: sqlite
-- Version: 4
-- API-Level: 1

CREATE TABLE labels(
    uuid BLOB PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT FALSE
);

CREATE TABLE note_labels(
    note_uuid BLOB NOT NULL REFERENCES notes(uuid) ON DELETE CASCADE,
    label_uuid BLOB NOT NULL REFERENCES labels(uuid) ON DELETE CASCADE,
    PRIMARY KEY (note_uuid, label_uuid)
);

CREATE INDEX note_labels_label_uuid ON note_labels(label_uuid);

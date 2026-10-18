CREATE TABLE notes(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- YYYY-MM-DD HH:MM:SS
    last_changed TEXT NOT NULL,  -- YYYY-MM-DDTHH:MM:SSZ
    favorite INTEGER NOT NULL DEFAULT FALSE
);

CREATE TABLE labels(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,  -- URL form, e.g. "home-improvement"
    color TEXT NOT NULL,  -- in CSS hex form, e.g. "#d73a4a"
    favorite INTEGER NOT NULL DEFAULT FALSE
);

CREATE TABLE note_labels(
    note_uuid BLOB NOT NULL REFERENCES notes(uuid) ON DELETE CASCADE,
    label_uuid BLOB NOT NULL REFERENCES labels(uuid) ON DELETE CASCADE,
    PRIMARY KEY (note_uuid, label_uuid)
);

CREATE INDEX note_labels_label_uuid ON note_labels(label_uuid);

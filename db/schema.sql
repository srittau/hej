CREATE TABLE notes(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- YYYY-MM-DD HH:MM:SS
    last_changed TEXT NOT NULL  -- YYYY-MM-DDTHH:MM:SSZ
);

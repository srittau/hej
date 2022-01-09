CREATE TABLE notes(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    last_changed TEXT NOT NULL  -- YYYY-MM-DDTHH:MM:SSZ
);

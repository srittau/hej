-- All notes
CREATE TABLE notes(
    uuid BLOB PRIMARY KEY,  -- valid UUID
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- YYYY-MM-DD HH:MM:SS
    last_changed TEXT NOT NULL,  -- YYYY-MM-DDTHH:MM:SSZ
    favorite INTEGER NOT NULL DEFAULT FALSE
);

-- Labels
CREATE TABLE labels(
    name VARCHAR(255) PRIMARY KEY,
    -- Hex color code, e.g., #FF5733
    color VARCHAR(7) NOT NULL,  
    -- Optional description of the label
    description VARCHAR(255) NOT NULL DEFAULT ''
);

-- Maps notes to labels
CREATE TABLE note_labels(
    -- References the note's UUID
    note_uuid BLOB NOT NULL,
    -- References the label's name
    label_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (note_uuid, label_name),
    FOREIGN KEY (note_uuid) REFERENCES notes(uuid) ON DELETE CASCADE,
    FOREIGN KEY (label_name) REFERENCES labels(name)
        ON DELETE CASCADE ON UPDATE CASCADE
);

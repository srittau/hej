-- Schema: hej
-- Dialect: sqlite
-- Version: 4
-- API-Level: 1

CREATE TABLE labels(
    name VARCHAR(255) PRIMARY KEY,
    color VARCHAR(7) NOT NULL,  
    description VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE note_labels(
    note_uuid BLOB NOT NULL,
    label_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (note_uuid, label_name),
    FOREIGN KEY (note_uuid) REFERENCES notes(uuid) ON DELETE CASCADE,
    FOREIGN KEY (label_name) REFERENCES labels(name)
        ON DELETE CASCADE ON UPDATE CASCADE
);

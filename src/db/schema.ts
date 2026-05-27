export const DB_VERSION = 10;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS cafe_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_name   TEXT NOT NULL,
  visited_at  TEXT NOT NULL,
  photos      TEXT,
  address     TEXT,
  memo        TEXT,
  is_favorite INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cafe_menu_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_log_id INTEGER NOT NULL REFERENCES cafe_logs(id) ON DELETE CASCADE,
  menu_name   TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cafe_tasting_notes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_menu_item_id INTEGER NOT NULL REFERENCES cafe_menu_items(id) ON DELETE CASCADE,
  is_blend          INTEGER DEFAULT 0,
  origin            TEXT,
  variety           TEXT,
  process           TEXT,
  roast_level       TEXT,
  official_notes    TEXT,
  my_notes          TEXT,
  temperature       TEXT,
  acidity           INTEGER,
  nuttiness         INTEGER,
  richness          INTEGER,
  smoothness        INTEGER
);

CREATE TABLE IF NOT EXISTS cafe_tasting_note_beans (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL REFERENCES cafe_tasting_notes(id) ON DELETE CASCADE,
  origin  TEXT,
  variety TEXT,
  process TEXT,
  ratio   INTEGER
);

CREATE TABLE IF NOT EXISTS espresso_notes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_menu_item_id INTEGER NOT NULL REFERENCES cafe_menu_items(id) ON DELETE CASCADE,
  tags              TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS recipes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  brew_method   TEXT NOT NULL,
  bean_name     TEXT,
  bean_amount   REAL,
  water_amount  REAL,
  water_temp    INTEGER,
  grind_size    TEXT,
  memo          TEXT,
  is_favorite   INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_order  INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  duration    INTEGER
);

CREATE TABLE IF NOT EXISTS brew_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id   INTEGER REFERENCES recipes(id),
  brewed_at   TEXT NOT NULL,
  rating      INTEGER,
  my_notes    TEXT,
  memo        TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
`;

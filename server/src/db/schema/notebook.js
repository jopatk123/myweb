/**
 * Initializes notebook notes table.
 * @param {import('better-sqlite3').Database} db
 */
export function initNotebookTables(db) {
  const notesTableSql = `
    CREATE TABLE IF NOT EXISTS notebook_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notebook_notes_completed ON notebook_notes(completed);
    CREATE INDEX IF NOT EXISTS idx_notebook_notes_category ON notebook_notes(category);
    CREATE INDEX IF NOT EXISTS idx_notebook_notes_created_at ON notebook_notes(created_at);
  `;

  db.exec(notesTableSql);
  console.log('📝 Notebook notes table initialized');
}

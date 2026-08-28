import { getDatabase } from './db';
import { Holiday } from '../types/models';

export class HolidayRepository {
  static async getAllHolidays(): Promise<Holiday[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM holidays ORDER BY date ASC;');
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      notes: r.notes || '',
    }));
  }

  static async getHolidayByDate(date: string): Promise<Holiday | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM holidays WHERE date = ?;', [date]);
    return row
      ? {
          id: row.id,
          date: row.date,
          title: row.title,
          notes: row.notes || '',
        }
      : null;
  }

  static async insertHoliday(date: string, title: string, notes = ''): Promise<number> {
    const db = await getDatabase();
    const res = await db.runAsync(
      'INSERT OR REPLACE INTO holidays (date, title, notes) VALUES (?, ?, ?);',
      [date, title, notes]
    );
    return res.lastInsertRowId;
  }

  static async deleteHoliday(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM holidays WHERE id = ?;', [id]);
  }
}

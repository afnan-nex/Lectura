export class DateUtils {
  static todayIso(): string {
    const now = new Date();
    return DateUtils.formatIso(now);
  }

  static formatIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static parseIso(isoString: string): Date {
    const [y, m, d] = isoString.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  static getDayOfWeek(date: Date): number {
    // JS: 0=Sun, 1=Mon, ..., 6=Sat
    // Target: 1=Mon, ..., 7=Sun
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  static getDayOfWeekFromIso(isoString: string): number {
    return DateUtils.getDayOfWeek(DateUtils.parseIso(isoString));
  }

  static getDayName(dayOfWeek: number, short = false): string {
    const days = [
      { long: 'Monday', short: 'Mon' },
      { long: 'Tuesday', short: 'Tue' },
      { long: 'Wednesday', short: 'Wed' },
      { long: 'Thursday', short: 'Thu' },
      { long: 'Friday', short: 'Fri' },
      { long: 'Saturday', short: 'Sat' },
      { long: 'Sunday', short: 'Sun' },
    ];
    const index = Math.max(1, Math.min(7, dayOfWeek)) - 1;
    return short ? days[index].short : days[index].long;
  }

  static formatDateHuman(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = DateUtils.parseIso(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return isoString;
    }
  }

  static formatDateShort(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = DateUtils.parseIso(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return isoString;
    }
  }

  static formatTime(time24: string, use24Hr = false): string {
    if (!time24) return '';
    if (use24Hr) return time24;
    try {
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr ? mStr.padStart(2, '0') : '00';
      const period = h >= 12 ? 'PM' : 'AM';
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return `${h}:${m} ${period}`;
    } catch {
      return time24;
    }
  }

  static formatTimeRange(start24: string, end24: string, use24Hr = false): string {
    return `${DateUtils.formatTime(start24, use24Hr)} – ${DateUtils.formatTime(end24, use24Hr)}`;
  }

  static calculateDurationMinutes(start24: string, end24: string): number {
    try {
      const [sh, sm] = start24.split(':').map(Number);
      const [eh, em] = end24.split(':').map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    } catch {
      return 60;
    }
  }

  static addDays(isoString: string, days: number): string {
    const d = DateUtils.parseIso(isoString);
    d.setDate(d.getDate() + days);
    return DateUtils.formatIso(d);
  }

  static addMonths(isoString: string, months: number): string {
    const d = DateUtils.parseIso(isoString);
    d.setMonth(d.getMonth() + months);
    return DateUtils.formatIso(d);
  }

  static daysBetween(startIso: string, endIso: string): number {
    try {
      const s = DateUtils.parseIso(startIso).getTime();
      const e = DateUtils.parseIso(endIso).getTime();
      return Math.round((e - s) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  static isDateInRange(targetIso: string, startIso?: string, endIso?: string): boolean {
    if (!targetIso) return true;
    if (startIso && targetIso < startIso) return false;
    if (endIso && targetIso > endIso) return false;
    return true;
  }

  static getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  }
}

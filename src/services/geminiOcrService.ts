import { ParsedTimetableItem } from '../types/models';
import { AttendanceCalculator } from '../domain/calculator';
import { DateUtils } from '../utils/dateUtils';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export class GeminiOcrService {
  static async extractTimetableFromBase64(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    customApiKey?: string
  ): Promise<ParsedTimetableItem[]> {
    const apiKey = customApiKey?.trim();
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please set it in Settings -> AI & Timetable Scanner.');
    }

    const prompt = `You are an expert academic timetable OCR parser.
Analyze this college/school timetable image carefully and extract all scheduled class slots.
Return a valid JSON object matching this schema strictly:
{
  "schedules": [
    {
      "subjectName": "Short Subject Acronym/Name (e.g. DBMS, OS, DAA, TOC, CN, AI, Math)",
      "subjectCode": "Course code if visible, else empty string",
      "teacherName": "Faculty name if visible, else empty string",
      "startTime": "HH:mm in 24-hour format (e.g. 09:00)",
      "endTime": "HH:mm in 24-hour format (e.g. 10:00)",
      "roomLocation": "Room / Lab number if visible, else empty string",
      "dayOfWeek": 1, // Integer: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
      "isPractical": false // true if lab/practical session, else false
    }
  ]
}

RULES:
1. Always prefer SHORT subject names/acronyms (e.g. "DBMS" over "Database Management Systems", "OS" over "Operating Systems").
2. Standardize all times to 24-hour HH:mm format.
3. If days are named Mon-Fri/Sat, map Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6, Sunday=7.
4. If a lab spans 2 hours, output the full start and end time with isPractical = true.
5. Return ONLY pure JSON without markdown backticks or extra text.`;

    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const candidateText =
          data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const rawItems = this.parseJsonExtraction(candidateText);
        if (rawItems.length > 0) {
          return this.postProcessAndMergeSlots(rawItems);
        }
      } catch (err: any) {
        lastError = err;
        // Continue to fallback model
      }
    }

    throw lastError || new Error('Failed to extract timetable schedule from image.');
  }

  private static parseJsonExtraction(jsonText: string): any[] {
    let clean = jsonText.trim();
    if (clean.startsWith('```json')) clean = clean.substring(7);
    if (clean.startsWith('```')) clean = clean.substring(3);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
    clean = clean.trim();

    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.schedules)) return parsed.schedules;
      if (Array.isArray(parsed.classes)) return parsed.classes;
      if (Array.isArray(parsed.items)) return parsed.items;
      return [];
    } catch {
      // Regex extraction fallback
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.schedules || [];
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  private static postProcessAndMergeSlots(rawSchedules: any[]): ParsedTimetableItem[] {
    const rawItems: ParsedTimetableItem[] = rawSchedules
      .filter((s) => s.subjectName && s.startTime && s.endTime && s.dayOfWeek)
      .map((s, idx) => {
        const isLab =
          Boolean(s.isPractical) ||
          s.subjectName.toLowerCase().includes('lab') ||
          s.subjectName.toLowerCase().includes('practical');

        const duration = DateUtils.calculateDurationMinutes(s.startTime, s.endTime);
        const unitRule = isLab ? 120 : 60;
        const units = AttendanceCalculator.calculateAttendanceUnits(duration, unitRule);

        return {
          id: `item_${idx}_${Date.now()}`,
          subjectName: s.subjectName.trim(),
          subjectCode: (s.subjectCode || '').trim(),
          teacherName: (s.teacherName || '').trim(),
          startTime: s.startTime.trim(),
          endTime: s.endTime.trim(),
          roomLocation: (s.roomLocation || s.room || '').trim(),
          dayOfWeek: Number(s.dayOfWeek),
          isPractical: isLab,
          attendanceUnitCount: units,
        };
      });

    // Group by day of week
    const byDay: { [day: number]: ParsedTimetableItem[] } = {};
    for (let day = 1; day <= 7; day++) byDay[day] = [];

    rawItems.forEach((item) => {
      if (byDay[item.dayOfWeek]) {
        byDay[item.dayOfWeek].push(item);
      }
    });

    const mergedResults: ParsedTimetableItem[] = [];

    Object.keys(byDay).forEach((dayStr) => {
      const day = Number(dayStr);
      const items = byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const mergedDay: ParsedTimetableItem[] = [];

      for (const current of items) {
        if (mergedDay.length === 0) {
          mergedDay.push(current);
          continue;
        }

        const last = mergedDay[mergedDay.length - 1];
        const isSameSubject =
          last.subjectName.toLowerCase() === current.subjectName.toLowerCase();
        const isSameCategory = last.isPractical === current.isPractical;
        const gap = DateUtils.calculateDurationMinutes(last.endTime, current.startTime);

        if (isSameSubject && isSameCategory && gap >= 0 && gap <= 15) {
          // Merge adjacent slots
          const mergedDuration = DateUtils.calculateDurationMinutes(last.startTime, current.endTime);
          const unitRule = last.isPractical ? 120 : 60;
          const mergedUnits = AttendanceCalculator.calculateAttendanceUnits(mergedDuration, unitRule);

          last.endTime = current.endTime;
          last.attendanceUnitCount = mergedUnits;
          if (!last.roomLocation && current.roomLocation) last.roomLocation = current.roomLocation;
          if (!last.teacherName && current.teacherName) last.teacherName = current.teacherName;
        } else {
          mergedDay.push(current);
        }
      }

      mergedResults.push(...mergedDay);
    });

    return mergedResults;
  }
}

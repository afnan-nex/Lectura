# Lectura 🎓
> Offline-First Academic Attendance Tracker, Weekly Timetable Planner, Safe Bunk Calculator, and Smart AI OCR Schedule Scanner built with **React Native**, **Material Design 3**, and **Monet Dynamic Theming**.

---

## ✨ Features & Architecture

### 📊 Attendance Tracking & Precision Math
- **Granular Multi-Hour Units**: Tracks individual class units (e.g. 2-hour lecture = 2 units, 2-hour practical lab = 1 unit).
- **Exact Safe Bunks Formula**:
  $$\text{Safe Bunks} = \left\lfloor \frac{100 \cdot P - T_{\text{target}} \cdot T}{T_{\text{target}}} + 10^{-9} \right\rfloor$$
- **Recovery Classes Calculation**:
  $$\text{Required Units} = \left\lceil \frac{T_{\text{target}} \cdot T - 100 \cdot P}{100 - T_{\text{target}}} - 10^{-9} \right\rceil$$
- **One-Tap Quick Marking**: Mark Present, Absent, Bunked, or Cancelled directly from the Home schedule cards.

### 📅 Rescheduling & Extra Classes
- **Class Rescheduler**: Move classes to new dates/times with reason notes and automatic `CANCELLED` marking on the original date.
- **One-Tap Revert**: Instant revert action available on both original and target dates.
- **Extra Class Scheduler**: Create ad-hoc sessions on any date without altering the weekly timetable.

### 🤖 Smart AI Timetable OCR Scanner
- Powered by **Google Gemini Multimodal Vision API** (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
- Automatically extracts classes, timings, rooms, and faculty from photos/scans.
- **Adjacent Slot Merger**: Intelligently merges consecutive same-subject slots (<= 15 min gap) into unified multi-unit sessions while preserving lab vs theory distinction.

### 🎨 Material Design 3 & Monet Colors
- Official `@material/material-color-utilities` algorithm generating dynamic tonal palettes.
- **12 Curated Preset Seed Colors** + Custom Hex Color Picker.
- Dark, Light, and System Theme Mode support with live palette preview.

### 💾 100% Offline-First Local Database
- Powered by **Expo SQLite** with foreign keys cascading constraints and indexing.
- **Full JSON Backup & Restore**: Resilient parser with automatic JSON repair.
- **CSV Attendance Report Export**: Formatted summary reports for college submissions.
- **Demo Data Generator**: Pre-fill sample subjects (DBMS, OS, DSA, Networks, Lab) and timetable.

### 🔔 Automated Class Reminders
- Local notifications scheduled $M$ minutes before upcoming classes.
- Audio chime and vibration feedback toggles.

---

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 57 (TypeScript)
- **UI Library**: React Native Paper (Material Design 3)
- **Dynamic Theming**: `@material/material-color-utilities` (Monet Colors)
- **Local Database**: `expo-sqlite`
- **Navigation**: `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- **Charts & Visuals**: `react-native-svg`
- **AI OCR**: Google Gemini 2.5 REST API
- **Notifications**: `expo-notifications`
- **File Storage & Sharing**: `expo-file-system`, `expo-sharing`, `expo-document-picker`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 18.x)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/agupta07505/Lectura.git
cd Lectura

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

---

## 📄 License
This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

---

<div align="center">
  Developed with ❤️ by <a href="https://github.com/afnan-nex">AFNAN</a>
</div>

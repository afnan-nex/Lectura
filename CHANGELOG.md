# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-29

### Added

- Interactive Material Design 3 **Calendar Date Picker Modal** accessible from the HomeScreen header for fast date jumping.
- Official adaptive launcher icons, solid background layer, and Android 13+ themed monochrome icons generated from vector SVGs (`#5852AA` brand palette).
- Developer profile attribution with direct link to [AFNAN](https://github.com/afnan-nex).

### Changed

- Renamed wallpaper dynamic theming to **Monet** and set it as the default out-of-the-box color scheme.
- Streamlined Appearance settings by removing the redundant default theme option, keeping pure **Monet** and **Custom Seed** palettes.
- Bumped application version to `v1.1.0` (build `2`).

### Removed

- Removed the `Scan Timetable OCR` option from the HomeScreen Speed Dial FAB to avoid redundant navigation into the Timetable section.
- Removed legacy missing glyph button and duplicate icons in the HomeScreen header.
- Removed the static default seed button from the Theme settings selector.

### Fixed

- Fixed horizontal Date Strip re-centering and jumping bug; selecting any date now performs pure state selection without shifting or resetting scroll position.
- Fixed weekday chips on Timetable screen to remove unwanted tick/checkmark icons.
- Fixed Timetable Scan OCR button height and vertical padding alignment for standard Material 3 tonal pill styling.
- Fixed bottom navigation Analytics icon to consistently display the solid donut icon across both active and inactive states.

## [1.0.0] - 2026-08-28

### Added

- Initial release of **Lectura** — smart, 100% offline-first Material 3 attendance and timetable tracker.
- Granular attendance engine supporting multi-hour lectures, lab unit weighting, and holiday exclusions.
- Mathematical safe bunks forecasting and required recovery class calculations.
- Weekly recurring timetable scheduler with extra class addition and session rescheduling capabilities.
- AI-powered timetable image scanning and extraction via Google Gemini 2.5 API.
- Full local SQLite database with JSON backup/restore and CSV summary export.
- Automated local notification reminders prior to scheduled classes.
- Material You Monet dynamic color palette generation powered by `@material/material-color-utilities` and `@pchmn/expo-material3-theme`.

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Surface, Text, Card, Switch, TextInput, Button, IconButton, Divider, Chip, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { PRESET_THEME_COLORS } from '../theme/monet';
import { PreferencesRepository, DEFAULT_PREFERENCES } from '../database/preferencesRepository';
import { NotificationService } from '../services/notificationService';
import { ExportImportService } from '../services/exportImportService';
import { UpdateCheckerService, GitHubReleaseInfo } from '../services/updateCheckerService';
import { UserPreferences } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

type SettingsSection = 'MAIN' | 'ATTENDANCE' | 'NOTIFICATIONS' | 'APPEARANCE' | 'AI_OCR' | 'DATA_BACKUP' | 'ABOUT';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    theme,
    themeMode,
    themeColorStyle,
    customThemeColor,
    setThemeMode,
    setThemeColorStyle,
    setCustomThemeColor,
  } = useLecturaTheme();
  const insets = useSafeAreaInsets();

  const [currentSection, setCurrentSection] = useState<SettingsSection>('MAIN');
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Form states
  const [targetText, setTargetText] = useState('75');
  const [reminderText, setReminderText] = useState('10');
  const [startDateText, setStartDateText] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [apiKeyText, setApiKeyText] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCustomHexDialog, setShowCustomHexDialog] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('#6750A4');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<GitHubReleaseInfo | null>(null);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    const p = await PreferencesRepository.getPreferences();
    setPrefs(p);
    setTargetText(String(p.defaultTargetAttendance));
    setReminderText(String(p.defaultReminderMinutes));
    setStartDateText(p.semesterStartDate);
    setEndDateText(p.semesterEndDate);
    setApiKeyText(p.geminiApiKey);
  };

  const updatePreferenceField = async (partial: Partial<UserPreferences>) => {
    const updated = await PreferencesRepository.updatePreferences(partial);
    setPrefs(updated);
  };

  const handleExportJson = async () => {
    const success = await ExportImportService.exportBackupJson();
    if (!success) {
      Alert.alert('Export Failed', 'Could not export backup file.');
    }
  };

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const importRes = await ExportImportService.importBackupJson(fileContent);
        Alert.alert(importRes.success ? 'Success' : 'Import Error', importRes.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to read document.');
    }
  };

  const handleExportCsv = async () => {
    const success = await ExportImportService.exportCsvReport();
    if (!success) {
      Alert.alert('Export Failed', 'Could not export CSV report.');
    }
  };

  const handleClearAllData = async () => {
    await ExportImportService.clearAllData();
    setShowClearConfirm(false);
    Alert.alert('Data Cleared', 'All subjects, timetable, and attendance records have been reset.');
  };

  const handleLoadDemoData = async () => {
    await ExportImportService.loadDemoData();
    Alert.alert('Demo Data Loaded', 'Loaded sample college timetable (DBMS, OS, DSA, Lab) with attendance records.');
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const info = await UpdateCheckerService.checkForUpdates('1.0.0');
      setReleaseInfo(info);
      if (!info) {
        Alert.alert('Up to date', 'You are running the latest version of Lectura (v1.0.0).');
      }
    } catch {
      Alert.alert('Check Failed', 'Could not connect to update server.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const sectionsList = [
    {
      key: 'ATTENDANCE' as SettingsSection,
      title: 'Attendance Rules & Goals',
      desc: 'Target percentage, reminder lead time & semester calendar',
      icon: 'track-changes',
    },
    {
      key: 'NOTIFICATIONS' as SettingsSection,
      title: 'Notifications & Alerts',
      desc: 'Class reminder alerts, audio chime & vibration toggles',
      icon: 'notifications-active',
    },
    {
      key: 'APPEARANCE' as SettingsSection,
      title: 'Appearance & Monet Theme',
      desc: 'System, Light, Dark mode & Material 3 dynamic color scheme',
      icon: 'palette',
    },
    {
      key: 'AI_OCR' as SettingsSection,
      title: 'AI & Timetable Scanner',
      desc: 'Personal Gemini API key & image OCR timetable extractor',
      icon: 'auto-awesome',
    },
    {
      key: 'DATA_BACKUP' as SettingsSection,
      title: 'Data Management & Backup',
      desc: 'Export/Restore JSON backup, CSV reports & data reset',
      icon: 'storage',
    },
    {
      key: 'ABOUT' as SettingsSection,
      title: 'About & Updates',
      desc: 'App version v1.0.0, release updates, developer & license',
      icon: 'school',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <Surface
        style={[
          styles.headerSurface,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 8,
          },
        ]}
        elevation={1}
      >
        <View style={styles.headerRow}>
          {currentSection !== 'MAIN' && (
            <IconButton icon="arrow-left" size={24} onPress={() => setCurrentSection('MAIN')} />
          )}
          <Text
            variant="headlineSmall"
            style={{ fontWeight: 'bold', color: theme.colors.onSurface, flex: 1, paddingLeft: currentSection === 'MAIN' ? 20 : 0 }}
          >
            {currentSection === 'MAIN'
              ? 'Settings'
              : sectionsList.find((s) => s.key === currentSection)?.title || 'Settings'}
          </Text>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}>
        {/* =================================================================== */}
        {/* MAIN SETTINGS OVERVIEW MENU                                         */}
        {/* =================================================================== */}
        {currentSection === 'MAIN' && (
          <View style={styles.sectionContainer}>
            {/* App Header Card */}
            <Card style={[styles.appHeaderCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
              <Card.Content style={styles.appHeaderContent}>
                <Surface style={[styles.appIconCircle, { backgroundColor: theme.colors.primary }]}>
                  <MaterialIcons name="school" size={28} color={theme.colors.onPrimary} />
                </Surface>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}>
                      Lectura
                    </Text>
                    <Surface style={[styles.versionBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text variant="labelSmall" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                        v1.0.0
                      </Text>
                    </Surface>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                    Smart attendance tracking & safe bunks
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Text variant="labelLarge" style={{ fontWeight: 'bold', color: theme.colors.primary, marginHorizontal: 20, marginTop: 12 }}>
              Preferences & Sections
            </Text>

            {/* 6 Sub-Window Cards */}
            {sectionsList.map((sec) => (
              <Card
                key={sec.key}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.elevation.level1,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                mode="outlined"
                onPress={() => setCurrentSection(sec.key)}
              >
                <Card.Content style={styles.sectionCardContent}>
                  <Surface style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialIcons name={sec.icon as any} size={22} color={theme.colors.primary} />
                  </Surface>

                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      {sec.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {sec.desc}
                    </Text>
                  </View>

                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                </Card.Content>
              </Card>
            ))}

            <TouchableOpacity
              onPress={() => Linking.openURL('https://github.com/afnan-nex')}
              style={styles.footerBranding}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                  Made with ❤️ by AFNAN
                </Text>
                <MaterialCommunityIcons name="github" size={20} color={theme.colors.primary} />
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4, textDecorationLine: 'underline' }}>
                github.com/afnan-nex
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =================================================================== */}
        {/* 1. ATTENDANCE RULES & GOALS SUB-WINDOW                              */}
        {/* =================================================================== */}
        {currentSection === 'ATTENDANCE' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Target Attendance Goal
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Target % used for safe bunks and recovery alerts
                </Text>

                <TextInput
                  label="Target Attendance (%)"
                  value={targetText}
                  onChangeText={(val) => {
                    setTargetText(val);
                    const n = parseFloat(val);
                    if (n) updatePreferenceField({ defaultTargetAttendance: n });
                  }}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                />

                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Quick Presets:
                </Text>
                <View style={styles.chipRow}>
                  {['70', '75', '80', '85', '90'].map((preset) => (
                    <Chip
                      key={preset}
                      selected={targetText === preset}
                      onPress={() => {
                        setTargetText(preset);
                        updatePreferenceField({ defaultTargetAttendance: parseFloat(preset) });
                      }}
                      style={styles.presetChip}
                    >
                      {preset}%
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Class Reminder Lead Time
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Minutes before class to trigger reminder notification
                </Text>

                <TextInput
                  label="Lead Time (Minutes)"
                  value={reminderText}
                  onChangeText={(val) => {
                    setReminderText(val);
                    const n = parseInt(val, 10);
                    if (n) updatePreferenceField({ defaultReminderMinutes: n });
                  }}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                />

                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Quick Presets:
                </Text>
                <View style={styles.chipRow}>
                  {['5', '10', '15', '30'].map((preset) => (
                    <Chip
                      key={preset}
                      selected={reminderText === preset}
                      onPress={() => {
                        setReminderText(preset);
                        updatePreferenceField({ defaultReminderMinutes: parseInt(preset, 10) });
                      }}
                      style={styles.presetChip}
                    >
                      {preset}m
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      Track by Semester
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {prefs.trackBySemester
                        ? 'Active — only track attendance within dates'
                        : 'Off — track year-round'}
                    </Text>
                  </View>
                  <Switch
                    value={prefs.trackBySemester}
                    onValueChange={(val) => {
                      updatePreferenceField({ trackBySemester: val });
                      if (val && (!startDateText || !endDateText)) {
                        const start = DateUtils.todayIso();
                        const end = DateUtils.addMonths(start, 4);
                        setStartDateText(start);
                        setEndDateText(end);
                        updatePreferenceField({ semesterStartDate: start, semesterEndDate: end });
                      }
                    }}
                  />
                </View>

                {prefs.trackBySemester && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      label="Semester Start Date (YYYY-MM-DD)"
                      value={startDateText}
                      onChangeText={(val) => {
                        setStartDateText(val);
                        updatePreferenceField({ semesterStartDate: val });
                      }}
                      mode="outlined"
                      style={styles.input}
                    />

                    <TextInput
                      label="Semester End Date (YYYY-MM-DD)"
                      value={endDateText}
                      onChangeText={(val) => {
                        setEndDateText(val);
                        updatePreferenceField({ semesterEndDate: val });
                      }}
                      mode="outlined"
                      style={styles.input}
                    />

                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                      Duration Presets:
                    </Text>
                    <View style={styles.chipRow}>
                      <Chip
                        onPress={() => {
                          const start = DateUtils.todayIso();
                          const end = DateUtils.addMonths(start, 4);
                          setStartDateText(start);
                          setEndDateText(end);
                          updatePreferenceField({ semesterStartDate: start, semesterEndDate: end });
                        }}
                        style={styles.presetChip}
                      >
                        4 Months
                      </Chip>
                      <Chip
                        onPress={() => {
                          const start = DateUtils.todayIso();
                          const end = DateUtils.addMonths(start, 6);
                          setStartDateText(start);
                          setEndDateText(end);
                          updatePreferenceField({ semesterStartDate: start, semesterEndDate: end });
                        }}
                        style={styles.presetChip}
                      >
                        6 Months
                      </Chip>
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* =================================================================== */}
        {/* 2. NOTIFICATIONS & ALERTS SUB-WINDOW                                */}
        {/* =================================================================== */}
        {currentSection === 'NOTIFICATIONS' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      Class Reminder Notifications
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Receive alerts before upcoming classes
                    </Text>
                  </View>
                  <Switch
                    value={prefs.notificationsEnabled}
                    onValueChange={async (val) => {
                      if (val) {
                        const granted = await NotificationService.requestPermissions();
                        if (granted) updatePreferenceField({ notificationsEnabled: true });
                      } else {
                        updatePreferenceField({ notificationsEnabled: false });
                        await NotificationService.cancelAllReminders();
                      }
                    }}
                  />
                </View>

                {prefs.notificationsEnabled && (
                  <View style={{ marginTop: 12 }}>
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                          Alert Sound
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Play notification chime
                        </Text>
                      </View>
                      <Switch
                        value={prefs.notificationSound}
                        onValueChange={(val) => updatePreferenceField({ notificationSound: val })}
                      />
                    </View>

                    <Divider style={{ marginVertical: 8 }} />
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                          Vibration Feedback
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Vibrate on class alert
                        </Text>
                      </View>
                      <Switch
                        value={prefs.notificationVibrate}
                        onValueChange={(val) => updatePreferenceField({ notificationVibrate: val })}
                      />
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* =================================================================== */}
        {/* 3. APPEARANCE & MONET THEME SUB-WINDOW                              */}
        {/* =================================================================== */}
        {currentSection === 'APPEARANCE' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Theme Mode
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Select your preferred light or dark appearance
                </Text>

                <View style={styles.themeModeRow}>
                  {[
                    { mode: 'SYSTEM', label: 'System', icon: 'brightness-auto' },
                    { mode: 'LIGHT', label: 'Light', icon: 'wb-sunny' },
                    { mode: 'DARK', label: 'Dark', icon: 'nightlight-round' },
                  ].map((item) => {
                    const isSelected = themeMode === item.mode;
                    return (
                      <Card
                        key={item.mode}
                        style={[
                          styles.modeCard,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected ? theme.colors.primary : 'transparent',
                            borderWidth: isSelected ? 2 : 0,
                          },
                        ]}
                        onPress={() => {
                          setThemeMode(item.mode as any);
                          updatePreferenceField({ themeMode: item.mode as any });
                        }}
                      >
                        <Card.Content style={{ alignItems: 'center', padding: 12 }}>
                          <MaterialIcons
                            name={item.icon as any}
                            size={24}
                            color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                          />
                          <Text
                            variant="labelMedium"
                            style={{
                              fontWeight: isSelected ? 'bold' : 'normal',
                              color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                              marginTop: 4,
                            }}
                          >
                            {item.label}
                          </Text>
                        </Card.Content>
                      </Card>
                    );
                  })}
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Monet Dynamic Color Engine
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Material You extracts dynamic palettes directly from your device wallpaper (Android 12+)
                </Text>

                <View style={styles.themeModeRow}>
                  {[
                    { style: 'DYNAMIC', label: 'Monet (Wallpaper)', icon: 'wallpaper' },
                    { style: 'DEFAULT', label: 'Default Theme', icon: 'invert-colors' },
                    { style: 'CUSTOM', label: 'Custom Seed', icon: 'palette' },
                  ].map((item) => {
                    const isSelected = themeColorStyle === item.style;
                    return (
                      <Card
                        key={item.style}
                        style={[
                          styles.modeCard,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected ? theme.colors.primary : 'transparent',
                            borderWidth: isSelected ? 2 : 0,
                          },
                        ]}
                        onPress={() => {
                          setThemeColorStyle(item.style as any);
                          updatePreferenceField({ themeColorStyle: item.style as any });
                        }}
                      >
                        <Card.Content style={{ alignItems: 'center', padding: 10 }}>
                          <MaterialIcons
                            name={item.icon as any}
                            size={22}
                            color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                          />
                          <Text
                            variant="labelSmall"
                            style={{
                              fontWeight: isSelected ? 'bold' : 'normal',
                              color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                              marginTop: 4,
                            }}
                          >
                            {item.label}
                          </Text>
                        </Card.Content>
                      </Card>
                    );
                  })}
                </View>

                {/* 12 Curated Seed Swatches */}
                {themeColorStyle === 'CUSTOM' && (
                  <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        Curated Seed Palettes:
                      </Text>
                      <Button mode="text" compact onPress={() => setShowCustomHexDialog(true)}>
                        Custom Hex
                      </Button>
                    </View>

                    <View style={styles.swatchPalette}>
                      {PRESET_THEME_COLORS.map((c) => {
                        const isSelected = customThemeColor.toLowerCase() === c.hex.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={c.hex}
                            onPress={() => {
                              setCustomThemeColor(c.hex);
                              updatePreferenceField({ customThemeColor: c.hex });
                            }}
                            style={[
                              styles.seedCircle,
                              { backgroundColor: c.hex },
                              isSelected && styles.selectedSeedCircle,
                            ]}
                          />
                        );
                      })}
                    </View>

                    {/* Live Preview Bar */}
                    <Surface style={[styles.palettePreviewBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant, flex: 1 }}>
                        Seed: {customThemeColor.toUpperCase()}
                      </Text>
                      <View style={[styles.previewDot, { backgroundColor: theme.colors.primary }]} />
                      <View style={[styles.previewDot, { backgroundColor: theme.colors.primaryContainer }]} />
                      <View style={[styles.previewDot, { backgroundColor: theme.colors.secondary }]} />
                      <View style={[styles.previewDot, { backgroundColor: theme.colors.tertiary }]} />
                    </Surface>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* =================================================================== */}
        {/* 4. AI & TIMETABLE SCANNER SUB-WINDOW                                */}
        {/* =================================================================== */}
        {currentSection === 'AI_OCR' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Gemini AI OCR Scanner
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Lectura uses Google Gemini to read timetable charts directly from photos. Add your free API key below.
                </Text>

                <TextInput
                  label="Gemini API Key"
                  value={apiKeyText}
                  onChangeText={(val) => {
                    setApiKeyText(val);
                    updatePreferenceField({ geminiApiKey: val });
                  }}
                  secureTextEntry={!apiKeyVisible}
                  right={
                    <TextInput.Icon
                      icon={apiKeyVisible ? 'eye-off' : 'eye'}
                      onPress={() => setApiKeyVisible(!apiKeyVisible)}
                    />
                  }
                  mode="outlined"
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  icon="open-in-new"
                  onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
                  style={{ marginTop: 12, borderRadius: 12 }}
                >
                  Get Free Key (Google AI Studio)
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* =================================================================== */}
        {/* 5. DATA MANAGEMENT & BACKUP SUB-WINDOW                              */}
        {/* =================================================================== */}
        {currentSection === 'DATA_BACKUP' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Backup & Export
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Export full database snapshots or CSV reports
                </Text>

                <Button
                  mode="contained"
                  icon="upload"
                  onPress={handleExportJson}
                  style={[styles.dataBtn, { backgroundColor: theme.colors.primary }]}
                >
                  Export JSON Backup
                </Button>

                <Button
                  mode="outlined"
                  icon="download"
                  onPress={handleImportJson}
                  style={styles.dataBtn}
                >
                  Restore JSON Backup
                </Button>

                <Button
                  mode="outlined"
                  icon="table-large"
                  onPress={handleExportCsv}
                  style={styles.dataBtn}
                >
                  Export Attendance CSV Report
                </Button>

                <Button
                  mode="text"
                  icon="auto-fix-high"
                  onPress={handleLoadDemoData}
                  style={styles.dataBtn}
                >
                  Load Sample College Demo Data
                </Button>

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.error }}>
                  Danger Zone
                </Text>
                <Button
                  mode="contained"
                  icon="delete-forever"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  onPress={() => setShowClearConfirm(true)}
                  style={{ marginTop: 8, borderRadius: 12 }}
                >
                  Clear All App Data
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* =================================================================== */}
        {/* 6. ABOUT & UPDATES SUB-WINDOW                                       */}
        {/* =================================================================== */}
        {currentSection === 'ABOUT' && (
          <View style={styles.sectionContainer}>
            <Card style={[styles.configCard, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
              <Card.Content>
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Surface style={[styles.largeAppIconCircle, { backgroundColor: theme.colors.primary }]}>
                    <MaterialIcons name="school" size={40} color={theme.colors.onPrimary} />
                  </Surface>
                  <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginTop: 8, color: theme.colors.onSurface }}>
                    Lectura
                  </Text>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    Version v1.0.0
                  </Text>
                </View>

                <Button
                  mode="contained-tonal"
                  icon="update"
                  loading={isCheckingUpdates}
                  onPress={handleCheckUpdates}
                  style={{ marginVertical: 8, borderRadius: 12 }}
                >
                  Check for Updates
                </Button>

                {releaseInfo && (
                  <Surface style={[styles.releaseInfoBox, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}>
                      {releaseInfo.isNewer ? `New Version Available: v${releaseInfo.version}` : `Latest Version: v${releaseInfo.version}`}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginVertical: 4 }}>
                      {releaseInfo.releaseNotes}
                    </Text>
                    {releaseInfo.isNewer && (
                      <Button
                        mode="contained"
                        icon="download"
                        onPress={() => Linking.openURL(releaseInfo.downloadUrl)}
                        style={{ marginTop: 8 }}
                      >
                        Download Update
                      </Button>
                    )}
                  </Surface>
                )}

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  Developer
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com/afnan-nex')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                >
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Made with ❤️ by
                  </Text>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.primary, textDecorationLine: 'underline' }}>
                    AFNAN (github.com/afnan-nex)
                  </Text>
                  <MaterialCommunityIcons name="open-in-new" size={14} color={theme.colors.primary} />
                </TouchableOpacity>

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  License & Open Source
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Lectura is open-source software licensed under the GNU General Public License v3.0 (GPL-3.0).
                </Text>
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Clear Data Confirmation Dialog */}
      <Portal>
        <Dialog visible={showClearConfirm} onDismiss={() => setShowClearConfirm(false)}>
          <Dialog.Title>Clear All Data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This action will permanently delete all courses, timetable slots, and attendance logs. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={handleClearAllData}>
              Clear Everything
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Custom Hex Seed Dialog */}
        <Dialog visible={showCustomHexDialog} onDismiss={() => setShowCustomHexDialog(false)}>
          <Dialog.Title>Enter Custom Seed Color</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Hex Color (e.g. #00639B)"
              value={customHexInput}
              onChangeText={setCustomHexInput}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCustomHexDialog(false)}>Cancel</Button>
            <Button
              onPress={() => {
                if (customHexInput.trim()) {
                  setCustomThemeColor(customHexInput.trim());
                  updatePreferenceField({ customThemeColor: customHexInput.trim() });
                }
                setShowCustomHexDialog(false);
              }}
            >
              Apply Color
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSurface: {
    paddingVertical: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  appHeaderCard: {
    borderRadius: 20,
    marginTop: 6,
  },
  appHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
  },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAppIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCard: {
    borderRadius: 18,
    marginVertical: 2,
  },
  sectionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configCard: {
    borderRadius: 20,
    marginVertical: 4,
  },
  input: {
    marginVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  presetChip: {
    height: 36,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    borderRadius: 14,
  },
  swatchPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  seedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  selectedSeedCircle: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  palettePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dataBtn: {
    marginVertical: 4,
    borderRadius: 12,
  },
  releaseInfoBox: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  footerBranding: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

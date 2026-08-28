import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Surface, Text, Button, IconButton, Divider, Switch, Card } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useLecturaTheme } from '../theme/themeContext';
import { ParsedTimetableItem } from '../types/models';
import { GeminiOcrService } from '../services/geminiOcrService';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  geminiApiKey?: string;
  onDismiss: () => void;
  onConfirmImport: (items: ParsedTimetableItem[], replaceExisting: boolean) => void;
}

export const TimetableOcrModal: React.FC<Props> = ({
  visible,
  geminiApiKey = '',
  onDismiss,
  onConfirmImport,
}) => {
  const { theme } = useLecturaTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedTimetableItem[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pickImage = async (useCamera = false) => {
    try {
      setErrorMessage('');
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setErrorMessage('Camera or gallery permission is required.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            base64: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            base64: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          processOcr(asset.base64, asset.mimeType || 'image/jpeg');
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to select image.');
    }
  };

  const processOcr = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setStepMessage('Extracting classes & timings from timetable photo...');
    try {
      const items = await GeminiOcrService.extractTimetableFromBase64(base64, mimeType, geminiApiKey);
      if (items.length === 0) {
        setErrorMessage('No valid classes found. Please ensure image is clear.');
      } else {
        setParsedItems(items);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'OCR parsing failed. Check API key.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedItems.length === 0) return;
    onConfirmImport(parsedItems, replaceExisting);
    handleReset();
    onDismiss();
  };

  const handleReset = () => {
    setImageUri(null);
    setParsedItems([]);
    setErrorMessage('');
    setIsProcessing(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level2 }]}>
          <View style={styles.header}>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                Smart AI Timetable OCR
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Scan photo of timetable to auto-generate schedule
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          {/* Action buttons if no image */}
          {parsedItems.length === 0 && !isProcessing && (
            <View style={styles.pickerOptions}>
              <Button
                mode="contained"
                icon="camera"
                onPress={() => pickImage(true)}
                style={styles.pickerBtn}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={() => pickImage(false)}
                style={styles.pickerBtn}
              >
                Choose from Gallery
              </Button>
            </View>
          )}

          {/* Processing State */}
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurface }}>
                {stepMessage}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {errorMessage ? (
            <Surface style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                ⚠️ {errorMessage}
              </Text>
            </Surface>
          ) : null}

          {/* Preview Parsed Items */}
          {parsedItems.length > 0 && !isProcessing && (
            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.previewHeader}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                  Detected Classes ({parsedItems.length} slots):
                </Text>
              </View>

              <View style={styles.toggleRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Replace existing timetable
                </Text>
                <Switch value={replaceExisting} onValueChange={setReplaceExisting} />
              </View>

              {parsedItems.map((item, idx) => (
                <Card key={item.id || idx} style={styles.itemCard} mode="outlined">
                  <Card.Content style={styles.itemCardContent}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        {item.subjectName} {item.isPractical ? '(Lab)' : ''}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {DateUtils.getDayName(item.dayOfWeek)} • {item.startTime} – {item.endTime}
                        {item.roomLocation ? ` • ${item.roomLocation}` : ''}
                      </Text>
                    </View>
                    <Surface style={[styles.unitsBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                        {item.attendanceUnitCount} Unit{item.attendanceUnitCount > 1 ? 's' : ''}
                      </Text>
                    </Surface>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            {parsedItems.length > 0 && (
              <Button mode="contained" onPress={handleConfirm}>
                Import Schedule
              </Button>
            )}
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerOptions: {
    marginVertical: 20,
    gap: 12,
  },
  pickerBtn: {
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorCard: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
  },
  previewHeader: {
    marginVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  itemCard: {
    marginVertical: 4,
    borderRadius: 12,
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  unitsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

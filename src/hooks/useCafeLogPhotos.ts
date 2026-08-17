import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { detectAndCrop } from '@/modules/document-scanner';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === 'granted') return true;
  Alert.alert('권한 필요', '카메라 권한이 필요해요.');
  return false;
};

const requestLibraryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;
  Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
  return false;
};

export const useCafeLogPhotos = () => {
  const [scanningNote, setScanningNote] = useState(false);

  const addNotePhoto = async (rawUri: string) => {
    setScanningNote(true);
    let uri = rawUri;
    try {
      uri = await detectAndCrop(rawUri);
    } catch {
      // 문서 인식 실패 시 원본을 사용한다.
    } finally {
      const state = useCafeLogDraftStore.getState();
      state.updateDraft({ notePhotos: [...state.notePhotos, uri], analyzed: false });
      setScanningNote(false);
    }
  };

  const pickNoteFromCamera = async () => {
    if (!(await requestCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) await addNotePhoto(result.assets[0].uri);
  };

  const pickNoteFromLibrary = async () => {
    if (!(await requestLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) await addNotePhoto(result.assets[0].uri);
  };

  const pickNotePhoto = () => {
    if (useCafeLogDraftStore.getState().notePhotos.length >= 2) return;
    Alert.alert('노트 사진', undefined, [
      { text: '카메라', onPress: pickNoteFromCamera },
      { text: '갤러리', onPress: pickNoteFromLibrary },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const setCoordinatesFromExif = (exif: Record<string, unknown> | null | undefined) => {
    if (!exif || useCafeLogDraftStore.getState().photoCoords) return;
    const lat = exif.GPSLatitude;
    const lng = exif.GPSLongitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    useCafeLogDraftStore.getState().setField('photoCoords', {
      lat: exif.GPSLatitudeRef === 'S' ? -Math.abs(lat) : Math.abs(lat),
      lng: exif.GPSLongitudeRef === 'W' ? -Math.abs(lng) : Math.abs(lng),
    });
  };

  const pickCafeFromCamera = async () => {
    if (!(await requestCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
    if (result.canceled) return;
    setCoordinatesFromExif(result.assets[0].exif as Record<string, unknown>);
    const state = useCafeLogDraftStore.getState();
    state.setField('cafePhotos', [...state.cafePhotos, result.assets[0].uri]);
  };

  const pickCafeFromLibrary = async () => {
    if (!(await requestLibraryPermission())) return;
    const state = useCafeLogDraftStore.getState();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - state.cafePhotos.length,
      quality: 1,
      exif: true,
    });
    if (result.canceled) return;
    setCoordinatesFromExif(result.assets[0].exif as Record<string, unknown>);
    state.setField('cafePhotos', [...state.cafePhotos, ...result.assets.map((asset) => asset.uri)]);
  };

  const pickCafePhoto = () => {
    if (useCafeLogDraftStore.getState().cafePhotos.length >= 10) return;
    Alert.alert('사진 추가', undefined, [
      { text: '카메라', onPress: pickCafeFromCamera },
      { text: '갤러리', onPress: pickCafeFromLibrary },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return { scanningNote, pickNotePhoto, pickCafePhoto };
};

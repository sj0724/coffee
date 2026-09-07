import { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CafeLog, CafeMenuItem, EspressoNote, HanddripNote } from '@/src/types';
import { parseAspectRatios } from '@/src/services/imageAspectRatios';
import {
  CafeLogShareCard,
  ShareCardDecoration,
  ShareCardInfoPosition,
  ShareCardVisibility,
} from './CafeLogShareCard';

type Props = {
  visible: boolean;
  onClose: () => void;
  log: CafeLog;
  menuItems: CafeMenuItem[];
  handdripNotes: Record<number, HanddripNote>;
  espressoNotes: Record<number, EspressoNote>;
  isSharing: boolean;
  onSharingChange: (isSharing: boolean) => void;
};

function DecorationChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="items-center justify-center flex-1 border rounded-full h-9"
      style={{
        backgroundColor: selected ? '#F2DF36' : '#FFFFFF',
        borderColor: selected ? '#F2DF36' : '#D8DADE',
      }}
    >
      <Text className="text-[12px] font-bold" style={{ color: selected ? '#101114' : '#3F4248' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CafeLogShareModal({
  visible,
  onClose,
  log,
  menuItems,
  handdripNotes,
  espressoNotes,
  isSharing,
  onSharingChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [shareVisibility, setShareVisibility] = useState<ShareCardVisibility>({
    date: true,
    address: true,
    menu: true,
    memo: true,
    branding: true,
  });
  const [shareDecoration, setShareDecoration] = useState<ShareCardDecoration>({
    textColor: 'white',
    textAlign: 'left',
    fontStyle: 'default',
    fontSize: 'medium',
    gradient: true,
  });
  const [shareInfoPosition, setShareInfoPosition] = useState<ShareCardInfoPosition>({
    x: 0.5,
    y: 0.76,
  });
  const [selectedShareImageKey, setSelectedShareImageKey] = useState('cafe-0');
  const shareCardRef = useRef<View>(null);

  async function handleSaveImage() {
    if (!shareCardRef.current || isSharing) return;

    try {
      onSharingChange(true);
      const uri = await captureRef(shareCardRef, {
        format: 'jpg',
        quality: 0.88,
        width: 1080,
        height: 1620,
        result: 'tmpfile',
      });

      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 추가 권한을 허용해주세요.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장했어요', '선택한 이미지가 사진 보관함에 저장됐어요.');
    } catch (error) {
      console.error('Failed to create share image', error);
      Alert.alert('이미지를 만들지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      onSharingChange(false);
    }
  }

  const cafePhotoUris: string[] = (() => {
    try {
      return log.photos ? JSON.parse(log.photos) : [];
    } catch {
      return [];
    }
  })();
  const notePhotoUris: string[] = (() => {
    try {
      return log.note_photos ? JSON.parse(log.note_photos) : [];
    } catch {
      return [];
    }
  })();
  const notePhotoAspectRatios = parseAspectRatios(log.note_photo_aspect_ratios);
  const notePhotoAspectRatio = notePhotoAspectRatios[0] || 1 / 1.4;
  const shareImageOptions = [
    ...cafePhotoUris.map((uri, index) => ({
      key: `cafe-${index}`,
      label: `카페 ${index + 1}`,
      uri,
      fit: 'cover' as const,
      aspectRatio: undefined,
    })),
    ...notePhotoUris.map((uri, index) => ({
      key: `card-${index}`,
      label: index === 0 ? '카드 앞면' : index === 1 ? '카드 뒷면' : `카드 ${index + 1}`,
      uri,
      fit: 'contain' as const,
      aspectRatio: notePhotoAspectRatios[index] || notePhotoAspectRatio,
    })),
  ];
  const selectedShareImage =
    shareImageOptions.find((item) => item.key === selectedShareImageKey) ?? shareImageOptions[0];
  const sharePreviewScale = Math.max(
    0.42,
    Math.min(0.68, (screenWidth - 64) / 360, (screenHeight - 460) / 540),
  );
  const shareOptions: {
    key: keyof ShareCardVisibility;
    label: string;
    available: boolean;
  }[] = [
    { key: 'address', label: '주소', available: !!log.address },
    { key: 'menu', label: '메뉴', available: menuItems.length > 0 },
    { key: 'memo', label: '메모', available: !!log.memo },
  ];

  function toggleShareOption(key: keyof ShareCardVisibility) {
    setShareVisibility((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateShareDecoration<K extends keyof ShareCardDecoration>(
    key: K,
    value: ShareCardDecoration[K],
  ) {
    setShareDecoration((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between px-4 h-14">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="공유 이미지 미리보기 닫기"
              className="items-center justify-center w-16 h-11"
            >
              <Ionicons name="close" size={25} color="#101114" />
            </TouchableOpacity>
            <Text className="text-[17px] font-bold text-coffee">공유 이미지 미리보기</Text>
            <TouchableOpacity
              onPress={handleSaveImage}
              disabled={isSharing}
              accessibilityRole="button"
              accessibilityLabel={isSharing ? '이미지 저장 중' : '이미지 저장'}
              accessibilityState={{ disabled: isSharing, busy: isSharing }}
              className="items-center justify-center w-16 h-11"
              style={{ opacity: isSharing ? 0.45 : 1 }}
            >
              <Ionicons
                name={isSharing ? 'hourglass-outline' : 'download-outline'}
                size={23}
                color="#101114"
              />
            </TouchableOpacity>
          </View>

          <View
            className="items-center justify-center bg-[#F5F5F3] py-4"
            style={{ height: 540 * sharePreviewScale + 32 }}
          >
            <View
              style={{
                width: 360 * sharePreviewScale,
                height: 540 * sharePreviewScale,
                overflow: 'visible',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.2,
                shadowRadius: 18,
                elevation: 10,
              }}
            >
              <View
                style={{
                  width: 360,
                  height: 540,
                  transform: [{ scale: sharePreviewScale }],
                  transformOrigin: 'top left',
                }}
              >
                <CafeLogShareCard
                  visibility={shareVisibility}
                  decoration={shareDecoration}
                  infoPosition={shareInfoPosition}
                  draggable
                  interactionScale={sharePreviewScale}
                  onInfoPositionChange={setShareInfoPosition}
                  log={log}
                  menuItems={menuItems}
                  handdripNotes={handdripNotes}
                  espressoNotes={espressoNotes}
                  photoUri={selectedShareImage?.uri}
                  photoFit={selectedShareImage?.fit}
                  photoAspectRatio={selectedShareImage?.aspectRatio}
                />
              </View>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}
          >
            {shareImageOptions.length > 0 ? (
              <>
                <Text className="mb-2 text-xs font-semibold text-coffee-muted">배경 이미지</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  className="flex-grow-0 mb-3"
                >
                  {shareImageOptions.map((item) => {
                    const selected = selectedShareImage?.key === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setSelectedShareImageKey(item.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${item.label}을 공유 이미지로 선택`}
                        className="items-center"
                      >
                        <View
                          className="overflow-hidden border-2 h-14 w-14 rounded-xl bg-coffee-light"
                          style={{ borderColor: selected ? '#F2DF36' : '#D8DADE' }}
                        >
                          <Image
                            source={{ uri: item.uri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit={item.fit}
                          />
                          {selected ? (
                            <View className="absolute items-center justify-center w-4 h-4 rounded-full bottom-1 right-1 bg-accent">
                              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>
                        <Text className="mt-1 text-[10px] text-coffee-muted">{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
            <Text className="mb-2 text-xs font-semibold text-coffee-muted">표시할 정보</Text>
            <View className="flex-row flex-wrap gap-2">
              {shareOptions.map((item) => {
                const selected = shareVisibility[item.key] && item.available;
                return (
                  <TouchableOpacity
                    key={item.key}
                    disabled={!item.available}
                    onPress={() => toggleShareOption(item.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: !item.available }}
                    className="items-center justify-center px-4 border rounded-full h-9"
                    style={{
                      backgroundColor: selected ? '#F2DF36' : '#FFFFFF',
                      borderColor: selected ? '#F2DF36' : '#D8DADE',
                      opacity: item.available ? 1 : 0.35,
                    }}
                  >
                    <Text
                      className="text-[13px] font-bold"
                      style={{ color: selected ? '#101114' : '#3F4248' }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="mt-3 mb-2 text-xs font-semibold text-coffee-muted">데코 설정</Text>
            <View className="gap-2">
              <View className="flex-row gap-2">
                <DecorationChoice
                  label="화이트"
                  selected={shareDecoration.textColor === 'white'}
                  onPress={() => updateShareDecoration('textColor', 'white')}
                />
                <DecorationChoice
                  label="블랙"
                  selected={shareDecoration.textColor === 'black'}
                  onPress={() => updateShareDecoration('textColor', 'black')}
                />
                <DecorationChoice
                  label="그라데이션"
                  selected={shareDecoration.gradient}
                  onPress={() => updateShareDecoration('gradient', !shareDecoration.gradient)}
                />
              </View>
              <View className="flex-row gap-2">
                {(
                  [
                    ['default', '기본', 'Pretendard'],
                    ['handwriting', '손글씨', 'Handwriting'],
                    ['retro', '레트로', 'PuzzleSans'],
                    ['myeongjo', '명조', 'Myeongjo'],
                  ] as const
                ).map(([value, label, fontFamily]) => {
                  const selected = shareDecoration.fontStyle === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => updateShareDecoration('fontStyle', value)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${label} 글꼴`}
                      accessibilityState={{ selected }}
                      className="items-center justify-center flex-1 h-10 border rounded-full"
                      style={{
                        backgroundColor: selected ? '#F2DF36' : '#FFFFFF',
                        borderColor: selected ? '#F2DF36' : '#D8DADE',
                      }}
                    >
                      <Text
                        className="text-[12px]"
                        style={{ color: selected ? '#101114' : '#3F4248', fontFamily }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View className="flex-row gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <DecorationChoice
                    key={size}
                    label={size === 'small' ? '작게' : size === 'medium' ? '중간' : '크게'}
                    selected={shareDecoration.fontSize === size}
                    onPress={() => updateShareDecoration('fontSize', size)}
                  />
                ))}
              </View>
              <View className="flex-row gap-2">
                {(['left', 'center', 'right'] as const).map((alignment) => (
                  <TouchableOpacity
                    key={alignment}
                    onPress={() => updateShareDecoration('textAlign', alignment)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${alignment === 'left' ? '왼쪽' : alignment === 'center' ? '가운데' : '오른쪽'} 정렬`}
                    accessibilityState={{ selected: shareDecoration.textAlign === alignment }}
                    className="items-center justify-center flex-1 border rounded-full h-9"
                    style={{
                      backgroundColor:
                        shareDecoration.textAlign === alignment ? '#F2DF36' : '#FFFFFF',
                      borderColor: shareDecoration.textAlign === alignment ? '#F2DF36' : '#D8DADE',
                    }}
                  >
                    <MaterialIcons
                      name={`format-align-${alignment}`}
                      size={19}
                      color={shareDecoration.textAlign === alignment ? '#101114' : '#3F4248'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View pointerEvents="none" className="absolute top-0" style={{ left: screenWidth + 40 }}>
        <CafeLogShareCard
          ref={shareCardRef}
          visibility={shareVisibility}
          decoration={shareDecoration}
          infoPosition={shareInfoPosition}
          log={log}
          menuItems={menuItems}
          handdripNotes={handdripNotes}
          espressoNotes={espressoNotes}
          photoUri={selectedShareImage?.uri}
          photoFit={selectedShareImage?.fit}
          photoAspectRatio={selectedShareImage?.aspectRatio}
        />
      </View>
    </>
  );
}

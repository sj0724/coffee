import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { FontScaleSlider } from './FontScaleSlider';
import { captureRef } from 'react-native-view-shot';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CafeLog, CafeMenuItem, EspressoNote, HanddripNote } from '@/src/types';
import { parseAspectRatios } from '@/src/services/imageAspectRatios';
import {
  CafeLogShareCard,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHTS,
  ShareCardFormat,
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

const DEFAULT_VISIBILITY: ShareCardVisibility = {
  date: true,
  address: true,
  menu: true,
  memo: true,
  branding: true,
};

const DEFAULT_DECORATION: ShareCardDecoration = {
  textColor: 'white',
  textAlign: 'left',
  fontStyle: 'default',
  fontScale: 1,
  gradient: true,
  cardBackground: 'default',
};

const DEFAULT_INFO_POSITION: ShareCardInfoPosition = {
  x: 0.5,
  y: 0.76,
};

const editorTabs = [
  { key: 'ratio', label: '비율', icon: 'crop-outline' },
  { key: 'background', label: '배경', icon: 'image-outline' },
  { key: 'info', label: '정보', icon: 'reader-outline' },
  { key: 'font', label: '글꼴', icon: 'text-outline' },
  { key: 'size', label: '크기', icon: 'resize-outline' },
  { key: 'alignment', label: '정렬', icon: 'reorder-three-outline' },
  { key: 'style', label: '스타일', icon: 'color-palette-outline' },
] as const;

type EditorTab = (typeof editorTabs)[number]['key'];

function SettingsRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      directionalLockEnabled
      alwaysBounceVertical={false}
      alwaysBounceHorizontal={false}
      bounces={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={{ height: 64, flexGrow: 0 }}
      contentContainerStyle={{ minWidth: '100%', height: 64, alignItems: 'center', gap: 8 }}
    >
      {children}
    </ScrollView>
  );
}

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
  const [shareVisibility, setShareVisibility] = useState<ShareCardVisibility>(DEFAULT_VISIBILITY);
  const [shareDecoration, setShareDecoration] = useState<ShareCardDecoration>(DEFAULT_DECORATION);
  const [shareInfoPosition, setShareInfoPosition] =
    useState<ShareCardInfoPosition>(DEFAULT_INFO_POSITION);
  const [selectedShareImageKey, setSelectedShareImageKey] = useState('cafe-0');
  const [activeTab, setActiveTab] = useState<EditorTab>('background');
  const [shareFormat, setShareFormat] = useState<ShareCardFormat>('story');
  const cardHeight = SHARE_CARD_HEIGHTS[shareFormat];
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (visible) return;
    setShareVisibility(DEFAULT_VISIBILITY);
    setShareDecoration(DEFAULT_DECORATION);
    setShareInfoPosition(DEFAULT_INFO_POSITION);
    setSelectedShareImageKey('cafe-0');
    setActiveTab('background');
    setShareFormat('story');
  }, [visible]);

  async function handleSaveImage() {
    if (!shareCardRef.current || isSharing) return;

    try {
      onSharingChange(true);
      const uri = await captureRef(shareCardRef, {
        format: 'jpg',
        quality: 0.88,
        width: SHARE_CARD_WIDTH * 3,
        height: cardHeight * 3,
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
  const settingsHeight = 80;
  const sharePreviewScale = Math.max(
    0.2,
    Math.min(
      (screenWidth - 32) / SHARE_CARD_WIDTH,
      (screenHeight - insets.top - insets.bottom - 56 - 60 - settingsHeight - 24) / cardHeight,
    ),
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

          <View className="flex-1 items-center justify-center bg-[#F5F5F3] py-3">
            <View
              style={{
                width: SHARE_CARD_WIDTH * sharePreviewScale,
                height: cardHeight * sharePreviewScale,
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
                  width: SHARE_CARD_WIDTH,
                  height: cardHeight,
                  transform: [{ scale: sharePreviewScale }],
                  transformOrigin: 'top left',
                }}
              >
                <CafeLogShareCard
                  height={cardHeight}
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

          <View
            key={activeTab}
            className="justify-center px-4 py-2 bg-white"
            style={{ height: settingsHeight, flexShrink: 0 }}
          >
            {activeTab === 'ratio' && (
              <SettingsRow>
                <DecorationChoice
                  label="4:5"
                  selected={shareFormat === 'feed'}
                  onPress={() => setShareFormat('feed')}
                />
                <DecorationChoice
                  label="9:16"
                  selected={shareFormat === 'story'}
                  onPress={() => setShareFormat('story')}
                />
              </SettingsRow>
            )}
            {activeTab === 'background' && (
              <View>
                {shareImageOptions.length > 0 ? (
                  <>
                    <SettingsRow>
                      {selectedShareImage?.fit === 'contain' && (
                        <>
                          {(['default', 'white'] as const).map((background) => (
                            <TouchableOpacity
                              key={background}
                              onPress={() => updateShareDecoration('cardBackground', background)}
                              accessibilityRole="radio"
                              accessibilityLabel={`카드 ${background === 'default' ? '기본' : '화이트'} 배경`}
                              accessibilityState={{
                                selected: shareDecoration.cardBackground === background,
                              }}
                              className="items-center justify-center px-3 border rounded-full h-9"
                              style={{
                                backgroundColor:
                                  shareDecoration.cardBackground === background
                                    ? '#F2DF36'
                                    : '#FFFFFF',
                                borderColor:
                                  shareDecoration.cardBackground === background
                                    ? '#F2DF36'
                                    : '#D8DADE',
                              }}
                            >
                              <Text className="text-xs font-bold text-coffee">
                                {background === 'default' ? '기본 배경' : '화이트'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <View className="mx-1 h-8 w-px bg-[#D8DADE]" />
                        </>
                      )}
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
                              className="overflow-hidden border-2 h-11 w-11 rounded-xl bg-coffee-light"
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
                    </SettingsRow>
                  </>
                ) : (
                  <Text className="py-4 text-sm text-coffee-muted">
                    등록된 사진이 없어 기본 배경을 사용해요.
                  </Text>
                )}
              </View>
            )}
            {activeTab === 'info' && (
              <View>
                <SettingsRow>
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
                </SettingsRow>
              </View>
            )}
            {activeTab === 'font' && (
              <View>
                <SettingsRow>
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
                        className="min-w-[80px] flex-1 items-center justify-center h-10 border rounded-full px-4"
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
                </SettingsRow>
              </View>
            )}
            {activeTab === 'size' && (
              <View>
                <FontScaleSlider
                  value={shareDecoration.fontScale}
                  onChange={(value) => updateShareDecoration('fontScale', value)}
                />
              </View>
            )}
            {activeTab === 'alignment' && (
              <View>
                <SettingsRow>
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
                        borderColor:
                          shareDecoration.textAlign === alignment ? '#F2DF36' : '#D8DADE',
                      }}
                    >
                      <MaterialIcons
                        name={`format-align-${alignment}`}
                        size={19}
                        color={shareDecoration.textAlign === alignment ? '#101114' : '#3F4248'}
                      />
                    </TouchableOpacity>
                  ))}
                </SettingsRow>
              </View>
            )}
            {activeTab === 'style' && (
              <View>
                <SettingsRow>
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
                </SettingsRow>
              </View>
            )}
          </View>
          <View className="h-[60px] flex-row items-center justify-center border-t border-[#ECEDEA] bg-white px-2">
            {editorTabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityRole="tab"
                  accessibilityLabel={`${tab.label} 설정`}
                  accessibilityState={{ selected }}
                  className="flex-1 max-w-16 items-center justify-center gap-0.5 py-1"
                >
                  <View
                    className="items-center justify-center w-10 rounded-full h-7"
                    style={{ backgroundColor: selected ? '#F2DF36' : 'transparent' }}
                  >
                    <Ionicons name={tab.icon} size={21} color={selected ? '#101114' : '#777B82'} />
                  </View>
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: selected ? '#101114' : '#777B82' }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <View pointerEvents="none" className="absolute top-0" style={{ left: screenWidth + 40 }}>
        <CafeLogShareCard
          height={cardHeight}
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

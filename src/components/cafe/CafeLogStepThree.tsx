import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoteInput } from './NoteInput';
import { TagsInput } from './TagsInput';
import type { HanddripNoteBean } from '@/src/types';

const COFFEE_MENU_PRESETS = [
  '아메리카노',
  '카페라떼',
  '플랫화이트',
  '카푸치노',
  '에스프레소',
  '콜드브루',
];
const NON_COFFEE_MENU_PRESETS = ['말차라떼', '초코라떼', '밀크티', '차', '에이드', '주스'];

export function Step3({
  analyzing,
  menuNotDrink,
  analyzed,
  photoMode,
  onReanalyze,
  menuName,
  onMenuName,
  isCoffeeDrink,
  onIsCoffeeDrink,
  isBlend,
  onIsBlend,
  origin,
  onOrigin,
  farm,
  onFarm,
  variety,
  onVariety,
  process,
  onProcess,
  roastLevel,
  onRoastLevel,
  officialNotes,
  onOfficialNotes,
  beans,
  onBeans,
}: {
  analyzing: boolean;
  menuNotDrink: boolean;
  analyzed: boolean;
  photoMode: 'handdip' | 'menu';
  onReanalyze?: () => void;
  menuName: string;
  onMenuName: (v: string) => void;
  isCoffeeDrink: boolean;
  onIsCoffeeDrink: (v: boolean) => void;
  isBlend: number;
  onIsBlend: (v: number) => void;
  origin: string;
  onOrigin: (v: string) => void;
  farm: string;
  onFarm: (v: string) => void;
  variety: string;
  onVariety: (v: string) => void;
  process: string;
  onProcess: (v: string) => void;
  roastLevel: string;
  onRoastLevel: (v: string) => void;
  officialNotes: string[];
  onOfficialNotes: (v: string[]) => void;
  beans: HanddripNoteBean[];
  onBeans: (v: HanddripNoteBean[]) => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      {/* 분석 상태 배너 */}
      {analyzed && !analyzing && menuNotDrink && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: '#FFF0F0',
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name="warning-outline" size={15} color="#c00" />
            <Text style={{ fontSize: 13, color: '#c00', fontWeight: '500', flex: 1 }}>
              카페 음료 사진이 아닌 것 같아요. 이전 단계에서 사진을 변경해주세요.
            </Text>
          </View>
          {onReanalyze && (
            <TouchableOpacity onPress={onReanalyze} style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 12, color: '#c00', fontWeight: '600' }}>재분석</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {analyzed && !analyzing && !menuNotDrink && onReanalyze && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: '#F5F5F5',
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles-outline" size={15} color="#555" />
            <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>자동 분석 완료</Text>
          </View>
          <TouchableOpacity onPress={onReanalyze}>
            <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>재분석</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 메뉴명 */}
      {photoMode === 'menu' ? (
        <MenuPicker
          menuName={menuName}
          onMenuName={onMenuName}
          isCoffeeDrink={isCoffeeDrink}
          onIsCoffeeDrink={onIsCoffeeDrink}
        />
      ) : (
        <NoteInput label="메뉴명" value={menuName} onChange={onMenuName} />
      )}

      {/* 핸드드립 전용: 원두 정보 */}
      {photoMode === 'handdip' && (
        <>
          <View>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>원두 종류</Text>
            <View
              style={{
                flexDirection: 'row',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isBlend === 0 ? '#111' : '#fff',
                }}
                onPress={() => onIsBlend(0)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isBlend === 0 ? '#fff' : '#999',
                  }}
                >
                  싱글 오리진
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isBlend === 1 ? '#111' : '#fff',
                }}
                onPress={() => onIsBlend(1)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isBlend === 1 ? '#fff' : '#999',
                  }}
                >
                  블랜드
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isBlend === 1 ? (
            <View style={{ gap: 12 }}>
              {beans.map((bean, idx) => (
                <BeanEditor
                  key={idx}
                  bean={bean}
                  index={idx}
                  onChange={(b) => onBeans(beans.map((x, i) => (i === idx ? b : x)))}
                  onRemove={() => onBeans(beans.filter((_, i) => i !== idx))}
                />
              ))}
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#C0C0C0',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => onBeans([...beans, {}])}
              >
                <Text style={{ fontSize: 13, color: '#999' }}>+ 원두 추가</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <NoteInput label="원산지" value={origin} onChange={onOrigin} />
              <NoteInput label="농장" value={farm} onChange={onFarm} />
              <NoteInput label="품종" value={variety} onChange={onVariety} />
              <NoteInput label="가공법" value={process} onChange={onProcess} />
            </View>
          )}

          <NoteInput label="로스팅" value={roastLevel} onChange={onRoastLevel} />
          <TagsInput
            label="공식 노트 (쉼표 구분)"
            value={officialNotes}
            onChange={onOfficialNotes}
          />
        </>
      )}
    </View>
  );
}

function MenuPicker({
  menuName,
  onMenuName,
  isCoffeeDrink,
  onIsCoffeeDrink,
}: {
  menuName: string;
  onMenuName: (v: string) => void;
  isCoffeeDrink: boolean;
  onIsCoffeeDrink: (v: boolean) => void;
}) {
  const presets = isCoffeeDrink ? COFFEE_MENU_PRESETS : NON_COFFEE_MENU_PRESETS;
  const [typeSelectorWidth, setTypeSelectorWidth] = useState(0);
  const typeSlide = useRef(new Animated.Value(isCoffeeDrink ? 0 : 1)).current;
  const presetOpacity = useRef(new Animated.Value(1)).current;
  const changingType = useRef(false);

  useEffect(() => {
    Animated.spring(typeSlide, {
      toValue: isCoffeeDrink ? 0 : 1,
      tension: 90,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [isCoffeeDrink, typeSlide]);

  function changeMenuType(nextIsCoffee: boolean) {
    if (nextIsCoffee === isCoffeeDrink || changingType.current) return;
    changingType.current = true;
    Animated.timing(presetOpacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      onIsCoffeeDrink(nextIsCoffee);
      Animated.timing(presetOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start(() => {
        changingType.current = false;
      });
    });
  }

  const typeOptionWidth = Math.max(0, (typeSelectorWidth - 6) / 2);

  return (
    <View
      style={{
        gap: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E1DB',
        backgroundColor: '#FAF9F7',
      }}
    >
      <View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B2926', marginBottom: 10 }}>
          메뉴 종류
        </Text>
        <View
          onLayout={(event) => setTypeSelectorWidth(event.nativeEvent.layout.width)}
          style={{
            position: 'relative',
            flexDirection: 'row',
            padding: 3,
            borderRadius: 11,
            backgroundColor: '#ECE9E4',
          }}
        >
          {typeOptionWidth > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: 3,
                width: typeOptionWidth,
                borderRadius: 9,
                backgroundColor: '#fff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                transform: [
                  {
                    translateX: typeSlide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, typeOptionWidth],
                    }),
                  },
                ],
              }}
            />
          )}
          {[
            { label: '커피', value: true },
            { label: '논커피', value: false },
          ].map((option) => {
            const selected = isCoffeeDrink === option.value;
            return (
              <TouchableOpacity
                key={option.label}
                onPress={() => changeMenuType(option.value)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 9,
                  borderRadius: 9,
                  zIndex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: selected ? '#222' : '#8A847C',
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Animated.View style={{ gap: 9, opacity: presetOpacity }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#5F5A54' }}>빠른 선택</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {presets.map((preset) => {
            const selected = menuName.trim() === preset;
            return (
              <TouchableOpacity
                key={preset}
                onPress={() => onMenuName(preset)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selected ? '#222' : '#D8D3CC',
                  backgroundColor: selected ? '#222' : '#fff',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: selected ? '#fff' : '#59544E',
                  }}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <View style={{ gap: 7 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#5F5A54' }}>직접 입력</Text>
        <TextInput
          value={menuName}
          onChangeText={onMenuName}
          placeholder="메뉴명을 입력해주세요"
          placeholderTextColor="#AAA49C"
          returnKeyType="done"
          style={{
            paddingHorizontal: 13,
            paddingVertical: 12,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: '#D8D3CC',
            backgroundColor: '#fff',
            fontSize: 14,
            color: '#222',
          }}
        />
      </View>
    </View>
  );
}

// ── Step 4: 내 노트 + 메모 ────────────────────────────

function BeanEditor({
  bean,
  index,
  onChange,
  onRemove,
}: {
  bean: HanddripNoteBean;
  index: number;
  onChange: (b: HanddripNoteBean) => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#666' }}>원두 {index + 1}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Text style={{ fontSize: 13, color: '#E07070' }}>삭제</Text>
        </TouchableOpacity>
      </View>
      <NoteInput
        label="원산지"
        value={bean.origin}
        onChange={(v) => onChange({ ...bean, origin: v })}
      />
      <NoteInput label="농장" value={bean.farm} onChange={(v) => onChange({ ...bean, farm: v })} />
      <NoteInput
        label="품종"
        value={bean.variety}
        onChange={(v) => onChange({ ...bean, variety: v })}
      />
      <NoteInput
        label="가공법"
        value={bean.process}
        onChange={(v) => onChange({ ...bean, process: v })}
      />
      <View>
        <Text style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>비율 (%)</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E0E0E0',
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            color: '#222',
            backgroundColor: '#fff',
          }}
          keyboardType="numeric"
          value={bean.ratio != null ? String(bean.ratio) : ''}
          onChangeText={(v) => onChange({ ...bean, ratio: v ? Number(v) : undefined })}
          placeholder="선택"
          placeholderTextColor="#C0C0C0"
        />
      </View>
    </View>
  );
}

// ── Section 레이아웃 헬퍼 ─────────────────────────────

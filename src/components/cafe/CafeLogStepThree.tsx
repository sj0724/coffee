import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { NoteInput } from './NoteInput';
import { TagsInput } from './TagsInput';
import type { GeneralMenuType, HanddripNoteBean } from '@/src/types';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

const COFFEE_MENU_PRESETS = [
  '아메리카노',
  '카페라떼',
  '플랫화이트',
  '카푸치노',
  '에스프레소',
  '콜드브루',
];
const NON_COFFEE_MENU_PRESETS = ['말차라떼', '초코라떼', '밀크티', '차', '에이드', '주스'];
const DESSERT_MENU_PRESETS = ['케이크', '쿠키', '스콘', '크루아상', '휘낭시에', '아이스크림'];

export function Step3({
  analyzing,
  onReanalyze,
}: {
  analyzing: boolean;
  onReanalyze?: () => void;
}) {
  const {
    analyzed,
    photoMode,
    menuName,
    menuType,
    isBlend,
    origin,
    farm,
    variety,
    process,
    roastLevel,
    officialNotes,
    beans,
    setField,
  } = useCafeLogDraftStore(
    useShallow((state) => ({
      analyzed: state.analyzed,
      photoMode: state.photoMode,
      menuName: state.menuName,
      menuType: state.menuType,
      isBlend: state.isBlend,
      origin: state.origin,
      farm: state.farm,
      variety: state.variety,
      process: state.process,
      roastLevel: state.roastLevel,
      officialNotes: state.officialNotes,
      beans: state.beans,
      setField: state.setField,
    })),
  );

  const onMenuName = (value: string) => setField('menuName', value);
  const onMenuType = (value: GeneralMenuType) => setField('menuType', value);
  const onIsBlend = (value: number) => setField('isBlend', value);
  const onOrigin = (value: string) => setField('origin', value);
  const onFarm = (value: string) => setField('farm', value);
  const onVariety = (value: string) => setField('variety', value);
  const onProcess = (value: string) => setField('process', value);
  const onRoastLevel = (value: string) => setField('roastLevel', value);
  const onOfficialNotes = (value: string[]) => setField('officialNotes', value);
  const onBeans = (value: typeof beans) => setField('beans', value);
  return (
    <View style={{ gap: 20 }}>
      {/* 분석 상태 배너 */}
      {analyzed && !analyzing && onReanalyze && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: '#F1F2F4',
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles-outline" size={15} color="#5F636B" />
            <Text style={{ fontSize: 13, color: '#5F636B', fontWeight: '500' }}>
              자동 분석 완료
            </Text>
          </View>
          <TouchableOpacity onPress={onReanalyze}>
            <Text style={{ fontSize: 12, color: '#5F636B', fontWeight: '600' }}>재분석</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 메뉴명 */}
      {photoMode === 'menu' ? (
        <MenuPicker
          menuName={menuName}
          onMenuName={onMenuName}
          menuType={menuType}
          onMenuType={onMenuType}
        />
      ) : (
        <NoteInput label="메뉴명" value={menuName} onChange={onMenuName} />
      )}

      {/* 핸드드립 전용: 원두 정보 */}
      {photoMode === 'handdip' && (
        <>
          <View>
            <Text style={{ fontSize: 13, color: '#5F636B', marginBottom: 8 }}>원두 종류</Text>
            <View
              style={{
                flexDirection: 'row',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#D8DADE',
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isBlend === 0 ? '#123C96' : '#FFFFFF',
                }}
                onPress={() => onIsBlend(0)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isBlend === 0 ? '#fff' : '#8D929B',
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
                  backgroundColor: isBlend === 1 ? '#123C96' : '#FFFFFF',
                }}
                onPress={() => onIsBlend(1)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isBlend === 1 ? '#fff' : '#8D929B',
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
                <Text style={{ fontSize: 13, color: '#8D929B' }}>+ 원두 추가</Text>
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
  menuType,
  onMenuType,
}: {
  menuName: string;
  onMenuName: (v: string) => void;
  menuType: GeneralMenuType;
  onMenuType: (v: GeneralMenuType) => void;
}) {
  const presets =
    menuType === 'coffee'
      ? COFFEE_MENU_PRESETS
      : menuType === 'dessert'
        ? DESSERT_MENU_PRESETS
        : NON_COFFEE_MENU_PRESETS;
  const [typeSelectorWidth, setTypeSelectorWidth] = useState(0);
  const typeSlide = useRef(
    new Animated.Value(menuType === 'coffee' ? 0 : menuType === 'nonCoffee' ? 1 : 2),
  ).current;
  const presetOpacity = useRef(new Animated.Value(1)).current;
  const changingType = useRef(false);

  useEffect(() => {
    Animated.spring(typeSlide, {
      toValue: menuType === 'coffee' ? 0 : menuType === 'nonCoffee' ? 1 : 2,
      tension: 90,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [menuType, typeSlide]);

  function changeMenuType(nextType: GeneralMenuType) {
    if (nextType === menuType || changingType.current) return;
    changingType.current = true;
    Animated.timing(presetOpacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      onMenuType(nextType);
      Animated.timing(presetOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start(() => {
        changingType.current = false;
      });
    });
  }

  const typeOptionWidth = Math.max(0, (typeSelectorWidth - 6) / 3);

  return (
    <View
      style={{
        gap: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F8F9FA',
      }}
    >
      <View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#101114', marginBottom: 10 }}>
          메뉴 종류
        </Text>
        <View
          onLayout={(event) => setTypeSelectorWidth(event.nativeEvent.layout.width)}
          style={{
            position: 'relative',
            flexDirection: 'row',
            padding: 3,
            borderRadius: 11,
            backgroundColor: '#ECEDEF',
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
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                transform: [
                  {
                    translateX: typeSlide.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0, typeOptionWidth, typeOptionWidth * 2],
                    }),
                  },
                ],
              }}
            />
          )}
          {[
            { label: '커피', value: 'coffee' as const },
            { label: '논커피', value: 'nonCoffee' as const },
            { label: '디저트', value: 'dessert' as const },
          ].map((option) => {
            const selected = menuType === option.value;
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
                    color: selected ? '#101114' : '#8D929B',
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
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#5F636B' }}>빠른 선택</Text>
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
                  borderColor: selected ? '#101114' : '#D8DADE',
                  backgroundColor: selected ? '#123C96' : '#FFFFFF',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: selected ? '#fff' : '#5F636B',
                  }}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <NoteInput label="메뉴명" value={menuName} onChange={onMenuName} required />
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
      style={{ borderWidth: 1, borderColor: '#D8DADE', borderRadius: 12, padding: 14, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#5F636B' }}>원두 {index + 1}</Text>
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
        <Text style={{ fontSize: 13, color: '#5F636B', marginBottom: 6 }}>비율 (%)</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#D8DADE',
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            color: '#101114',
            backgroundColor: '#FFFFFF',
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

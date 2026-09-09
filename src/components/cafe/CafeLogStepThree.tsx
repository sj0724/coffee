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
  analysisError,
  onReanalyze,
}: {
  analyzing: boolean;
  analysisError?: string | null;
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
    roastery,
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
      roastery: state.roastery,
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
    <View className="gap-5">
      {/* 분석 상태 배너 */}
      {!analyzing && onReanalyze && (
        <View className="flex-row items-center justify-between rounded-xl bg-[#F1F2F4] p-3">
          <View className="flex-1 flex-row items-center gap-1.5 pr-3">
            <Ionicons name="sparkles-outline" size={15} color="#5F636B" />
            <Text className="flex-1 text-[13px] font-medium text-coffee-tan">
              {analysisError ||
                (analyzed ? '자동 분석 완료' : '사진에서 원두 정보를 분석할 수 있어요.')}
            </Text>
          </View>
          <TouchableOpacity onPress={onReanalyze}>
            <Text className="text-[13px] font-semibold text-coffee-tan">
              {analysisError ? '다시 시도' : analyzed ? '재분석' : '분석'}
            </Text>
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
            <Text className="mb-2 text-[13px] text-coffee-tan">원두 종류</Text>
            <View className="flex-row overflow-hidden rounded-[10px] border border-coffee-border">
              <TouchableOpacity
                className="flex-1 items-center py-2.5"
                style={{ backgroundColor: isBlend === 0 ? '#123C96' : '#FFFFFF' }}
                onPress={() => onIsBlend(0)}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isBlend === 0 ? '#fff' : '#8D929B' }}
                >
                  싱글 오리진
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center py-2.5"
                style={{ backgroundColor: isBlend === 1 ? '#123C96' : '#FFFFFF' }}
                onPress={() => onIsBlend(1)}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isBlend === 1 ? '#fff' : '#8D929B' }}
                >
                  블랜드
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isBlend === 1 ? (
            <View className="gap-3">
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
                className="items-center rounded-[10px] border border-dashed border-[#C0C0C0] py-3"
                onPress={() => onBeans([...beans, {}])}
              >
                <Text className="text-[13px] text-coffee-warm">+ 원두 추가</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3.5">
              <NoteInput label="원산지" value={origin} onChange={onOrigin} />
              <NoteInput label="농장" value={farm} onChange={onFarm} />
              <NoteInput label="품종" value={variety} onChange={onVariety} />
              <NoteInput label="가공법" value={process} onChange={onProcess} />
            </View>
          )}

          <NoteInput
            label="로스터리"
            value={roastery}
            onChange={(value) => setField('roastery', value)}
          />
          <NoteInput label="로스팅 정도" value={roastLevel} onChange={onRoastLevel} />
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
    <View className="gap-4 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4">
      <View>
        <Text className="mb-2.5 text-[15px] font-bold text-coffee">메뉴 종류</Text>
        <View
          className="relative flex-row rounded-[11px] bg-coffee-separator p-[3px]"
          onLayout={(event) => setTypeSelectorWidth(event.nativeEvent.layout.width)}
        >
          {typeOptionWidth > 0 && (
            <Animated.View
              className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[9px] bg-white"
              style={{
                width: typeOptionWidth,
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
                className="z-[1] flex-1 items-center rounded-[9px] py-[9px]"
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: selected ? '#101114' : '#8D929B' }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Animated.View className="gap-[9px]" style={{ opacity: presetOpacity }}>
        <Text className="text-[13px] font-semibold text-coffee-tan">빠른 선택</Text>
        <View className="flex-row flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = menuName.trim() === preset;
            return (
              <TouchableOpacity
                key={preset}
                onPress={() => onMenuName(preset)}
                className="rounded-full border px-3 py-2"
                style={{
                  borderColor: selected ? '#101114' : '#D8DADE',
                  backgroundColor: selected ? '#123C96' : '#FFFFFF',
                }}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: selected ? '#fff' : '#5F636B' }}
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
    <View className="gap-3 rounded-xl border border-coffee-border p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-coffee-tan">원두 {index + 1}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Text className="text-[13px] text-[#E07070]">삭제</Text>
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
        <Text className="mb-1.5 text-[13px] text-coffee-tan">비율 (%)</Text>
        <TextInput
          className="rounded-[10px] border border-coffee-border bg-white p-2.5 text-sm text-coffee"
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

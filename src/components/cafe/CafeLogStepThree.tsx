import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoteInput } from './NoteInput';
import { TagsInput } from './TagsInput';
import type { HanddripNoteBean } from '@/src/types';

export function Step3({
  analyzing,
  menuNotDrink,
  analyzed,
  photoMode,
  onReanalyze,
  menuName,
  onMenuName,
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
      <NoteInput label="메뉴명" value={menuName} onChange={onMenuName} />

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

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createRecipe } from '@/src/db/queries/recipes';
import { replaceRecipeSteps } from '@/src/db/queries/recipeSteps';
import { RecipeStep } from '@/src/types';

const BREW_METHODS = [
  '핸드드립',
  '에스프레소',
  '프렌치프레스',
  '에어로프레스',
  '모카포트',
  '콜드브루',
  '기타',
];

interface StepForm {
  title: string;
  description: string;
  duration: string;
}

export default function NewBrewScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [brewMethod, setBrewMethod] = useState(BREW_METHODS[0]);
  const [beanName, setBeanName] = useState('');
  const [beanAmount, setBeanAmount] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [grindSize, setGrindSize] = useState('');
  const [memo, setMemo] = useState('');
  const [steps, setSteps] = useState<StepForm[]>([{ title: '', description: '', duration: '' }]);
  const [saving, setSaving] = useState(false);

  function addStep() {
    setSteps((s) => [...s, { title: '', description: '', duration: '' }]);
  }

  function removeStep(index: number) {
    setSteps((s) => s.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof StepForm, value: string) {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('필수 항목', '레시피 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    const recipeId = await createRecipe({
      name: name.trim(),
      brew_method: brewMethod,
      bean_name: beanName.trim() || undefined,
      bean_amount: beanAmount ? Number(beanAmount) : undefined,
      water_amount: waterAmount ? Number(waterAmount) : undefined,
      water_temp: waterTemp ? Number(waterTemp) : undefined,
      grind_size: grindSize.trim() || undefined,
      memo: memo.trim() || undefined,
    });

    if (recipeId != null && steps.some((s) => s.title.trim())) {
      const validSteps: Omit<RecipeStep, 'id'>[] = steps
        .filter((s) => s.title.trim())
        .map((s, i) => ({
          recipe_id: recipeId,
          step_order: i + 1,
          title: s.title.trim(),
          description: s.description.trim() || undefined,
          duration: s.duration ? Number(s.duration) : undefined,
        }));
      await replaceRecipeSteps(recipeId, validSteps);
    }

    setSaving(false);
    if (recipeId != null) {
      router.replace(`/brew/${recipeId}`);
    } else {
      Alert.alert('오류', '저장에 실패했어요.');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 bg-coffee-light"
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      >
        <Field label="레시피 이름 *">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
            value={name}
            onChangeText={setName}
            placeholder="나의 드립 레시피"
            placeholderTextColor="#C8BFB0"
          />
        </Field>

        <Field label="추출 방식">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {BREW_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`px-3.5 py-2 rounded-full border ${
                    m === brewMethod ? 'bg-coffee border-coffee' : 'bg-coffee-cream border-coffee-border'
                  }`}
                  onPress={() => setBrewMethod(m)}
                >
                  <Text
                    className={`text-[13px] ${
                      m === brewMethod ? 'text-white font-semibold' : 'text-[#816F62]'
                    }`}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        <Field label="원두">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
            value={beanName}
            onChangeText={setBeanName}
            placeholder="에티오피아 예가체프"
            placeholderTextColor="#C8BFB0"
          />
        </Field>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="원두 (g)">
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={beanAmount}
                onChangeText={setBeanAmount}
                keyboardType="decimal-pad"
                placeholder="15"
                placeholderTextColor="#C8BFB0"
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="물 (ml)">
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={waterAmount}
                onChangeText={setWaterAmount}
                keyboardType="decimal-pad"
                placeholder="250"
                placeholderTextColor="#C8BFB0"
              />
            </Field>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="물 온도 (°C)">
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={waterTemp}
                onChangeText={setWaterTemp}
                keyboardType="number-pad"
                placeholder="93"
                placeholderTextColor="#C8BFB0"
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="분쇄도">
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={grindSize}
                onChangeText={setGrindSize}
                placeholder="중간"
                placeholderTextColor="#C8BFB0"
              />
            </Field>
          </View>
        </View>

        <Field label="메모">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
            style={{ height: 70, textAlignVertical: 'top' }}
            value={memo}
            onChangeText={setMemo}
            placeholder="특이사항..."
            placeholderTextColor="#C8BFB0"
            multiline
            numberOfLines={2}
          />
        </Field>

        <View className="gap-3">
          <Text className="text-[15px] font-bold text-[#5E493D]">타이머 단계</Text>
          {steps.map((step, i) => (
            <View key={i} className="bg-coffee-cream rounded-[10px] p-3 gap-2 shadow-sm">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] font-semibold text-coffee">단계 {i + 1}</Text>
                {steps.length > 1 && (
                  <TouchableOpacity onPress={() => removeStep(i)}>
                    <Ionicons name="close-circle-outline" size={20} color="#E6531E" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={step.title}
                onChangeText={(v) => updateStep(i, 'title', v)}
                placeholder="뜸들이기"
                placeholderTextColor="#C8BFB0"
              />
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={step.description}
                onChangeText={(v) => updateStep(i, 'description', v)}
                placeholder="설명 (선택)"
                placeholderTextColor="#C8BFB0"
              />
              <TextInput
                className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#3A1B0F] bg-coffee-cream"
                value={step.duration}
                onChangeText={(v) => updateStep(i, 'duration', v)}
                keyboardType="number-pad"
                placeholder="시간 (초, 선택)"
                placeholderTextColor="#C8BFB0"
              />
            </View>
          ))}
          <TouchableOpacity className="flex-row items-center gap-1.5 py-1" onPress={addStep}>
            <Ionicons name="add-circle-outline" size={20} color="#3A1B0F" />
            <Text className="text-sm font-semibold text-coffee">단계 추가</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className={`bg-coffee rounded-xl p-4 items-center mt-2 ${saving ? 'opacity-60' : ''}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-base font-bold text-white">{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-[#444]">{label}</Text>
      {children}
    </View>
  );
}

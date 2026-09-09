import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

interface KakaoPlace {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  category_name: string;
  phone: string;
}

export interface PlaceResult {
  name: string;
  address: string;
}

interface Props {
  visible: boolean;
  onSelect: (result: PlaceResult) => void;
  onClose: () => void;
}

export function AddressSearchModal({ visible, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<TextInput>(null);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=15`,
        { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(`API 오류 ${res.status}: ${json.message ?? ''}`);
        setResults([]);
      } else {
        setResults(json.documents ?? []);
      }
    } catch (e) {
      setErrorMsg(`네트워크 오류: ${String(e)}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(place: KakaoPlace) {
    onSelect({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
    });
    handleClose();
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    setSearched(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* 헤더 */}
          <View className="flex-row items-center border-b border-[#eee] px-4 py-3">
            <Text className="flex-1 text-[17px] font-semibold text-coffee">카페 검색</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#5F636B" />
            </TouchableOpacity>
          </View>

          {/* 검색창 */}
          <View className="m-4 flex-row items-center gap-2 rounded-xl bg-[#F1F2F4] px-3.5 py-2.5">
            <Ionicons name="search" size={18} color="#101114" />
            <TextInput
              ref={inputRef}
              className="flex-1 text-[15px] text-coffee"
              placeholder="카페 이름으로 검색..."
              placeholderTextColor="#8D929B"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setResults([]);
                  setSearched(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#8D929B" />
              </TouchableOpacity>
            )}
          </View>

          {/* 에러 */}
          {errorMsg ? (
            <View className="mx-4 mb-2 rounded-lg bg-[#FFF0F0] p-2.5">
              <Text className="text-[13px] text-[#c00]">{errorMsg}</Text>
            </View>
          ) : null}

          {/* 결과 */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#101114" />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListEmptyComponent={
                searched ? (
                  <View className="items-center pt-[60px]">
                    <Text className="text-[15px] text-coffee-warm">검색 결과가 없어요.</Text>
                  </View>
                ) : (
                  <View className="items-center pt-[60px]">
                    <Ionicons name="cafe-outline" size={40} color="#D8DADE" />
                    <Text className="mt-3 text-sm text-coffee-warm">카페 이름을 검색해보세요</Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  className="border-b border-[#f0f0f0] px-4 py-3.5"
                >
                  <Text className="text-[15px] font-semibold text-coffee">{item.place_name}</Text>
                  {item.road_address_name ? (
                    <Text className="mt-[3px] text-[13px] text-coffee-tan">
                      {item.road_address_name}
                    </Text>
                  ) : null}
                  {item.category_name ? (
                    <Text className="mt-0.5 text-[13px] text-coffee-warm" numberOfLines={1}>
                      {item.category_name}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

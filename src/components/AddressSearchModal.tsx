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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
          {/* 헤더 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#101114' }}>
              카페 검색
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#5F636B" />
            </TouchableOpacity>
          </View>

          {/* 검색창 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: '#F1F2F4',
              borderRadius: 12,
              gap: 8,
            }}
          >
            <Ionicons name="search" size={18} color="#101114" />
            <TextInput
              ref={inputRef}
              style={{ flex: 1, fontSize: 15, color: '#101114' }}
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
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                padding: 10,
                backgroundColor: '#FFF0F0',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#c00', fontSize: 13 }}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* 결과 */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
                  <View style={{ alignItems: 'center', paddingTop: 60 }}>
                    <Text style={{ color: '#8D929B', fontSize: 15 }}>검색 결과가 없어요.</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingTop: 60 }}>
                    <Ionicons name="cafe-outline" size={40} color="#D8DADE" />
                    <Text style={{ color: '#8D929B', fontSize: 14, marginTop: 12 }}>
                      카페 이름을 검색해보세요
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#101114' }}>
                    {item.place_name}
                  </Text>
                  {item.road_address_name ? (
                    <Text style={{ fontSize: 13, color: '#5F636B', marginTop: 3 }}>
                      {item.road_address_name}
                    </Text>
                  ) : null}
                  {item.category_name ? (
                    <Text style={{ fontSize: 12, color: '#8D929B', marginTop: 2 }} numberOfLines={1}>
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

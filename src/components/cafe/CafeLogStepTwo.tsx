import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { Section } from './CafeLogFormSection';
import type { NearbyPlace } from './cafeLogFormTypes';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';
import { CafeLogDatePicker } from './CafeLogDatePicker';

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

export function Step2({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { selectedPlace, photoCoords, setField } = useCafeLogDraftStore(
    useShallow((state) => ({
      selectedPlace: state.selectedPlace,
      photoCoords: state.photoCoords,
      setField: state.setField,
    })),
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const hasCoords = photoCoords !== null;

  useEffect(() => {
    if (!photoCoords) return;

    const controller = new AbortController();

    const fetchNearby = async () => {
      setNearbyLoading(true);
      try {
        const response = await fetch(
          `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=CE7&x=${photoCoords.lng}&y=${photoCoords.lat}&radius=500&sort=distance&size=10`,
          {
            headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
            signal: controller.signal,
          },
        );
        const json = await response.json();
        setNearbyPlaces(json.documents ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setNearbyPlaces([]);
      } finally {
        if (!controller.signal.aborted) setNearbyLoading(false);
      }
    };

    void fetchNearby();
    return () => controller.abort();
  }, [photoCoords]);

  const selectNearby = (place: NearbyPlace) => {
    setField('selectedPlace', {
      name: place.place_name,
      address: place.road_address_name || place.address_name,
    });
  };
  function formatDistance(d?: string) {
    if (!d) return '';
    const n = Number(d);
    return n < 1000 ? `${n}m` : `${(n / 1000).toFixed(1)}km`;
  }

  return (
    <View style={{ gap: 24 }}>
      <Section label="카페 *">
        {selectedPlace ? (
          /* 선택된 카페 카드 */
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#101114',
              padding: 14,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#101114' }}>
                  {selectedPlace.name}
                </Text>
                {selectedPlace.address ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  >
                    <Ionicons name="location-outline" size={13} color="#8D929B" />
                    <Text style={{ fontSize: 13, color: '#70757E' }} numberOfLines={2}>
                      {selectedPlace.address}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => setField('selectedPlace', null)}
                style={{ padding: 2, marginLeft: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#8D929B" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onOpenSearch}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, color: '#101114', fontWeight: '600' }}>직접 검색</Text>
            </TouchableOpacity>
          </View>
        ) : hasCoords ? (
          /* 근처 카페 목록 */
          <View style={{ gap: 8 }}>
            {nearbyLoading ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 }}
              >
                <ActivityIndicator size="small" color="#101114" />
                <Text style={{ fontSize: 13, color: '#8D929B' }}>
                  사진 위치로 근처 카페 검색 중...
                </Text>
              </View>
            ) : nearbyPlaces.length > 0 ? (
              <>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}
                >
                  <Ionicons name="location" size={13} color="#101114" />
                  <Text style={{ fontSize: 12, color: '#101114', fontWeight: '600' }}>
                    반경 500m 근처 카페
                  </Text>
                </View>
                {nearbyPlaces.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => selectNearby(p)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#D8DADE',
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#101114' }}>
                        {p.place_name}
                      </Text>
                      {p.distance ? (
                        <Text style={{ fontSize: 12, color: '#101114', fontWeight: '500' }}>
                          {formatDistance(p.distance)}
                        </Text>
                      ) : null}
                    </View>
                    {p.road_address_name || p.address_name ? (
                      <Text
                        style={{ fontSize: 12, color: '#8D929B', marginTop: 3 }}
                        numberOfLines={1}
                      >
                        {p.road_address_name || p.address_name}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text
                style={{ fontSize: 13, color: '#8D929B', textAlign: 'center', paddingVertical: 12 }}
              >
                근처 카페를 찾지 못했어요.
              </Text>
            )}
            <TouchableOpacity
              onPress={onOpenSearch}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#D8DADE',
                borderStyle: 'dashed',
                marginTop: 4,
              }}
            >
              <Ionicons name="search" size={15} color="#5F636B" />
              <Text style={{ fontSize: 13, color: '#5F636B', fontWeight: '600' }}>직접 검색</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* GPS 없음 - 직접 검색 버튼 */
          <TouchableOpacity
            onPress={onOpenSearch}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 18,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#D8DADE',
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="search" size={18} color="#101114" />
            <Text style={{ fontSize: 15, color: '#101114', fontWeight: '600' }}>카페 검색</Text>
          </TouchableOpacity>
        )}
      </Section>

      <Section label="방문 날짜">
        <CafeLogDatePicker />
      </Section>
    </View>
  );
}

// ── Step 3: 커피 정보 ─────────────────────────────────

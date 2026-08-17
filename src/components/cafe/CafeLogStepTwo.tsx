import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Section } from './CafeLogFormSection';
import type { NearbyPlace } from './cafeLogFormTypes';

export function Step2({
  selectedPlace,
  visitedAt,
  nearbyPlaces,
  nearbyLoading,
  hasCoords,
  onSelectNearby,
  onOpenSearch,
  onClearPlace,
  onOpenDatePicker,
}: {
  selectedPlace: { name: string; address: string } | null;
  visitedAt: string;
  nearbyPlaces: NearbyPlace[];
  nearbyLoading: boolean;
  hasCoords: boolean;
  onSelectNearby: (p: NearbyPlace) => void;
  onOpenSearch: () => void;
  onClearPlace: () => void;
  onOpenDatePicker: () => void;
}) {
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
              borderColor: '#3A1B0F',
              padding: 14,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#3A1B0F' }}>
                  {selectedPlace.name}
                </Text>
                {selectedPlace.address ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  >
                    <Ionicons name="location-outline" size={13} color="#A59688" />
                    <Text style={{ fontSize: 13, color: '#8B7A6D' }} numberOfLines={2}>
                      {selectedPlace.address}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={onClearPlace} style={{ padding: 2, marginLeft: 8 }}>
                <Ionicons name="close-circle" size={20} color="#A59688" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onOpenSearch}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, color: '#3A1B0F', fontWeight: '600' }}>직접 검색</Text>
            </TouchableOpacity>
          </View>
        ) : hasCoords ? (
          /* 근처 카페 목록 */
          <View style={{ gap: 8 }}>
            {nearbyLoading ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 }}
              >
                <ActivityIndicator size="small" color="#3A1B0F" />
                <Text style={{ fontSize: 13, color: '#A59688' }}>
                  사진 위치로 근처 카페 검색 중...
                </Text>
              </View>
            ) : nearbyPlaces.length > 0 ? (
              <>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}
                >
                  <Ionicons name="location" size={13} color="#3A1B0F" />
                  <Text style={{ fontSize: 12, color: '#3A1B0F', fontWeight: '600' }}>
                    반경 500m 근처 카페
                  </Text>
                </View>
                {nearbyPlaces.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => onSelectNearby(p)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#C8BFB0',
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#3A1B0F' }}>
                        {p.place_name}
                      </Text>
                      {p.distance ? (
                        <Text style={{ fontSize: 12, color: '#3A1B0F', fontWeight: '500' }}>
                          {formatDistance(p.distance)}
                        </Text>
                      ) : null}
                    </View>
                    {p.road_address_name || p.address_name ? (
                      <Text style={{ fontSize: 12, color: '#A59688', marginTop: 3 }} numberOfLines={1}>
                        {p.road_address_name || p.address_name}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text
                style={{ fontSize: 13, color: '#A59688', textAlign: 'center', paddingVertical: 12 }}
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
                borderColor: '#C8BFB0',
                borderStyle: 'dashed',
                marginTop: 4,
              }}
            >
              <Ionicons name="search" size={15} color="#816F62" />
              <Text style={{ fontSize: 13, color: '#816F62', fontWeight: '600' }}>직접 검색</Text>
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
              borderColor: '#C8BFB0',
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="search" size={18} color="#3A1B0F" />
            <Text style={{ fontSize: 15, color: '#3A1B0F', fontWeight: '600' }}>카페 검색</Text>
          </TouchableOpacity>
        )}
      </Section>

      <Section label="방문 날짜">
        <TouchableOpacity
          onPress={onOpenDatePicker}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 14,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#C8BFB0',
          }}
        >
          <Text style={{ fontSize: 15, color: '#3A1B0F' }}>{visitedAt}</Text>
          <Ionicons name="calendar-outline" size={18} color="#A59688" />
        </TouchableOpacity>
      </Section>
    </View>
  );
}

// ── Step 3: 커피 정보 ─────────────────────────────────

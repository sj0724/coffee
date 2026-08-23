export type MenuCategory = 'handdip' | 'espresso' | 'simple' | 'dessert';
export type GeneralMenuType = 'coffee' | 'nonCoffee' | 'dessert';

export interface CafeLog {
  id?: number;
  cafe_name: string;
  visited_at: string;
  photos?: string; // JSON array of cafe/menu photo URIs
  photo_aspect_ratios?: string; // JSON array matching photos
  note_photos?: string; // JSON array of note card photo URIs
  note_photo_aspect_ratios?: string; // JSON array matching note_photos
  address?: string;
  memo?: string;
  is_favorite?: number;
  created_at?: string;
  menu_count?: number;
  first_my_notes?: string;
  all_my_notes_concat?: string; // "||"-separated JSON arrays from all menu items
}

export interface CafeMenuItem {
  id?: number;
  cafe_log_id: number;
  menu_name: string;
  is_coffee?: number | null; // 1 = coffee, 0 = non-coffee, 2 = dessert
  created_at?: string;
}

export interface HanddripNoteBean {
  id?: number;
  note_id?: number;
  origin?: string;
  farm?: string;
  variety?: string;
  process?: string;
  ratio?: number; // %, optional
}

export interface HanddripNote {
  id?: number;
  cafe_menu_item_id: number;
  is_blend?: number; // 0 = 싱글 오리진, 1 = 블랜드
  origin?: string; // 싱글 오리진 전용
  farm?: string; // 싱글 오리진 전용
  variety?: string; // 싱글 오리진 전용
  process?: string; // 싱글 오리진 전용
  roast_level?: string;
  official_notes?: string[];
  my_notes?: string[];
  acidity?: number;
  nuttiness?: number;
  richness?: number;
  smoothness?: number;
  beans?: HanddripNoteBean[]; // 블랜드 전용
}

export interface EspressoNote {
  id?: number;
  cafe_menu_item_id: number;
  tags: string[]; // e.g. ["진함", "산미있음"]
}

export type MenuCategory = 'handdip' | 'espresso' | 'simple';

export interface CafeLog {
  id?: number;
  cafe_name: string;
  visited_at: string;
  photos?: string; // JSON array of cafe/menu photo URIs
  note_photos?: string; // JSON array of note card photo URIs
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
  is_coffee?: number | null;
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

export interface Recipe {
  id?: number;
  name: string;
  brew_method: string;
  bean_name?: string;
  bean_amount?: number;
  water_amount?: number;
  water_temp?: number;
  grind_size?: string;
  memo?: string;
  is_favorite?: number;
  created_at?: string;
}

export interface RecipeStep {
  id?: number;
  recipe_id: number;
  step_order: number;
  title: string;
  description?: string;
  duration?: number;
}

export interface BrewLog {
  id?: number;
  recipe_id?: number;
  brewed_at: string;
  rating?: number;
  my_notes?: string[];
  memo?: string;
  created_at?: string;
}

export interface CafeLog {
  id?: number;
  cafe_name: string;
  visited_at: string;
  photo_uri?: string;
  memo?: string;
  created_at?: string;
}

export interface CafeMenuItem {
  id?: number;
  cafe_log_id: number;
  menu_name: string;
  created_at?: string;
}

export interface CafeTastingNote {
  id?: number;
  cafe_menu_item_id: number;
  origin?: string;
  variety?: string;
  process?: string;
  roast_level?: string;
  official_notes?: string[];
  my_notes?: string[];
  temperature?: string;
  acidity?: number;
  nuttiness?: number;
  richness?: number;
  smoothness?: number;
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

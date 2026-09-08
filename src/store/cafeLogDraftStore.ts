import { create } from 'zustand';
import type { GeneralMenuType, HanddripNoteBean } from '../types';

export type CafeLogPhotoMode = 'handdip' | 'menu';

export type SelectedCafe = {
  name: string;
  address: string;
};

export type PhotoCoordinates = {
  lat: number;
  lng: number;
};

export interface CafeLogDraft {
  step: number;
  recordTypeSelected: boolean;
  photoMode: CafeLogPhotoMode;
  notePhotos: string[];
  cafePhotos: string[];
  photoCoords: PhotoCoordinates | null;
  selectedPlace: SelectedCafe | null;
  visitedAt: string;
  menuType: GeneralMenuType;
  analyzed: boolean;
  menuName: string;
  isBlend: number;
  origin: string;
  farm: string;
  variety: string;
  process: string;
  roastLevel: string;
  roastery: string;
  officialNotes: string[];
  myNotes: string[];
  espressoTags: string[];
  acidity?: number;
  nuttiness?: number;
  richness?: number;
  smoothness?: number;
  beans: HanddripNoteBean[];
  memo: string;
}

interface CafeLogDraftState extends CafeLogDraft {
  setField: <K extends keyof CafeLogDraft>(field: K, value: CafeLogDraft[K]) => void;
  updateDraft: (update: Partial<CafeLogDraft>) => void;
  selectRecordType: (mode: CafeLogPhotoMode) => void;
  resetDraft: () => void;
}

const createInitialDraft = (): CafeLogDraft => ({
  step: 1,
  recordTypeSelected: false,
  photoMode: 'handdip',
  notePhotos: [],
  cafePhotos: [],
  photoCoords: null,
  selectedPlace: null,
  visitedAt: new Date().toISOString().slice(0, 10),
  menuType: 'coffee',
  analyzed: false,
  menuName: '',
  isBlend: 0,
  origin: '',
  farm: '',
  variety: '',
  process: '',
  roastLevel: '',
  roastery: '',
  officialNotes: [],
  myNotes: [],
  espressoTags: [],
  acidity: undefined,
  nuttiness: undefined,
  richness: undefined,
  smoothness: undefined,
  beans: [],
  memo: '',
});

const createCoffeeDraft = (): Pick<
  CafeLogDraft,
  | 'notePhotos'
  | 'menuType'
  | 'analyzed'
  | 'menuName'
  | 'isBlend'
  | 'origin'
  | 'farm'
  | 'variety'
  | 'process'
  | 'roastLevel'
  | 'roastery'
  | 'officialNotes'
  | 'myNotes'
  | 'espressoTags'
  | 'acidity'
  | 'nuttiness'
  | 'richness'
  | 'smoothness'
  | 'beans'
> => ({
  notePhotos: [],
  menuType: 'coffee',
  analyzed: false,
  menuName: '',
  isBlend: 0,
  origin: '',
  farm: '',
  variety: '',
  process: '',
  roastLevel: '',
  roastery: '',
  officialNotes: [],
  myNotes: [],
  espressoTags: [],
  acidity: undefined,
  nuttiness: undefined,
  richness: undefined,
  smoothness: undefined,
  beans: [],
});

export const useCafeLogDraftStore = create<CafeLogDraftState>((set, get) => ({
  ...createInitialDraft(),
  setField: (field, value) => set({ [field]: value } as Pick<CafeLogDraft, typeof field>),
  updateDraft: (update) => set(update),
  selectRecordType: (mode) => {
    const modeChanged = get().photoMode !== mode;
    set({
      ...(modeChanged ? createCoffeeDraft() : {}),
      photoMode: mode,
      recordTypeSelected: true,
    });
  },
  resetDraft: () => set(createInitialDraft()),
}));

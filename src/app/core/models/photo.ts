export interface Photo {
  id: string;
  title?: string;
  small: string;
  large: string;
  description: string;
  createdAt: string;
  tags: string[];
  location?: string;
  legacyId?: number;
  isFavorite?: boolean; // 🔹 Campo para marcar como favorita
}

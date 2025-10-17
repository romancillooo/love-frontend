export interface Photo {
  id: number;
  small: string;
  large: string;
  description: string;
  createdAt: string;
  tags?: string[];
  location?: string;
}

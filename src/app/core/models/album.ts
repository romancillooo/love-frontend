// src/app/core/models/album.ts
export interface Album {
  id: string;
  name: string;
  description: string;
  coverPhotoUrl?: string;
  photoIds: string[];
  photoCount: number;
  createdAt?: string;
  updatedAt?: string;
}

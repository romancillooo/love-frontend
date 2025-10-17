import { Injectable } from '@angular/core';
import photosData from '../../../public/assets/data/photos.json';
import lettersData from '../../../public/assets/data/letters.json';
import { Photo } from './models/photo';
import { Letter } from './models/letter';

@Injectable({ providedIn: 'root' })
export class MemoriesService {
  private readonly photos: Photo[] = this.normalizePhotos(photosData as Photo[]);
  private readonly letters: Letter[] = this.normalizeLetters(lettersData as Letter[]);

  getAllPhotos(): Photo[] {
    return [...this.photos];
  }

  getPhotoYears(): number[] {
    const years = new Set<number>();
    this.photos.forEach(photo => years.add(new Date(photo.createdAt).getFullYear()));
    return Array.from(years.values()).sort((a, b) => b - a);
  }

  getRecentPhotos(count = 4): Photo[] {
    return this.photos.slice(0, count);
  }

  getAllLetters(): Letter[] {
    return [...this.letters];
  }

  getLetterById(id: number): Letter | undefined {
    return this.letters.find(letter => letter.id === id);
  }

  getLetterPreview(letter: Letter, maxLength = 110): string {
    const normalized = letter.content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  }

  private normalizePhotos(photos: Photo[]): Photo[] {
    return [...photos]
      .filter(photo => !!photo.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private normalizeLetters(letters: Letter[]): Letter[] {
    return [...letters];
  }
}

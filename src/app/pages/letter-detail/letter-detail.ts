import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MemoriesService } from '../../core/memories.service';
import { Letter } from '../../core/models/letter';

@Component({
  selector: 'app-letter-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-detail.html',
  styleUrls: ['./letter-detail.scss']
})
export class LetterDetail implements OnInit, OnDestroy {
  letter: Letter | undefined;
  displayText = '';

  private typingIndex = 0;
  private lastTimestamp = 0;
  private animationId: number | null = null;
  private readonly stepDelay = 45; // ms

  private readonly typeWriterStep = (timestamp: number) => {
    if (!this.letter) return;

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const elapsed = timestamp - this.lastTimestamp;
    if (elapsed >= this.stepDelay) {
      const steps = Math.max(1, Math.floor(elapsed / this.stepDelay));
      this.typingIndex = Math.min(
        this.typingIndex + steps,
        this.letter.content.length
      );
      this.displayText = this.letter.content.slice(0, this.typingIndex);
      this.lastTimestamp = timestamp;
      this.cdr.markForCheck();
    }

    if (this.typingIndex < this.letter.content.length) {
      this.animationId = requestAnimationFrame(this.typeWriterStep);
    } else {
      this.cancelAnimation();
    }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly memories: MemoriesService
  ) {}

  ngOnInit() {
    // 🔹 Siempre al entrar al componente, ir al top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.letter = this.memories.getLetterById(id);

    if (this.letter) {
      this.startTypewriter();
    }
  }

  ngOnDestroy() {
    this.cancelAnimation();
  }

  private startTypewriter() {
    this.cancelAnimation();
    this.displayText = '';
    this.typingIndex = 0;
    this.lastTimestamp = 0;
    this.animationId = requestAnimationFrame(this.typeWriterStep);
  }

  private cancelAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

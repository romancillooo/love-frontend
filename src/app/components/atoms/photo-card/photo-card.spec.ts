import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoCard } from './photo-card';

describe('PhotoCard', () => {
  let component: PhotoCard;
  let fixture: ComponentFixture<PhotoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

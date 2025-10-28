import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoPreview } from './photo-preview';

describe('PhotoPreview', () => {
  let component: PhotoPreview;
  let fixture: ComponentFixture<PhotoPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoPreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

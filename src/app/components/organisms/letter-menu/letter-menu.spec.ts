import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LetterMenu } from './letter-menu';

describe('LetterMenu', () => {
  let component: LetterMenu;
  let fixture: ComponentFixture<LetterMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LetterMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(LetterMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

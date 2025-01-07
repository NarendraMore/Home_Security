import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCameraComponent } from './add-camera.component';

describe('AddCameraComponent', () => {
  let component: AddCameraComponent;
  let fixture: ComponentFixture<AddCameraComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddCameraComponent]
    });
    fixture = TestBed.createComponent(AddCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from 'src/app/service/service.service';

@Component({
  selector: 'app-add-camera',
  templateUrl: './add-camera.component.html',
  styleUrls: ['./add-camera.component.css'],
})
export class AddCameraComponent {
  faceCameraForm: FormGroup;
  serveillanceCameraForm!: FormGroup;
  activeTab: string = 'faceCamera';
  selectedConnectionType: string = '';
  toastVisible = false; // Control the visibility of the toast
  toastMessage = ''; //

  constructor(private fb: FormBuilder, private service: ServiceService) {
    this.faceCameraForm = this.fb.group({
      cameratype: ['face_cam', Validators.required],
      url: [''],
      usb: [''],
    });

    this.serveillanceCameraForm = this.fb.group({
      cameratype: ['incident_cam', Validators.required],
      url: [''],
      usb: [null],
    });
  }
  ngOnInit() {}
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
  onConnectionTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedConnectionType = target.value;

    // Reset unused field
    if (this.selectedConnectionType === 'usb') {
      this.faceCameraForm.get('url')?.reset(); // Clear 'url' field
    } else if (this.selectedConnectionType === 'url') {
      this.faceCameraForm.get('usb')?.reset(); // Clear 'usb' field
    }
  }

  addCamera() {
    if (this.faceCameraForm.valid) {
      const cameraformData = {
        ...this.faceCameraForm.value,
        cam_id: 0, // Add the cam_id field
        usb:
          this.selectedConnectionType === 'usb'
            ? this.faceCameraForm.value.usb
            : null,
        url:
          this.selectedConnectionType === 'url'
            ? this.faceCameraForm.value.url
            : null,
      };

      console.log('Form Data:', cameraformData);

      this.service.addCameraType(cameraformData).subscribe(
        (data: any) => {
          console.log('Response:', data);
          this.toastMessage = 'Face Camera Saved Successfully!';
          this.showToast(); // Show success toast
          // Reset specific form controls except 'cameratype'
          this.faceCameraForm.patchValue({
            usb: '',
            url: '',
          });
          this.selectedConnectionType = ''; // Reset the selected connection type
        },
        (error: HttpErrorResponse) => {
          // Handle error response from server
          if (error.error && error.error.error) {
            this.toastMessage = error.error.error; // Extract error message
          } else {
            this.toastMessage = 'Failed to save the form. Please try again.'; // Fallback error message
          }
          this.showToast();
        }
      );
    } else {
      this.toastMessage = 'Please fill out the form correctly.';
      this.showToast(); // Show validation toast
    }
  }

  addSurveillanceCamera() {
    if (this.serveillanceCameraForm.valid) {
      const servicameraformData = {
        ...this.serveillanceCameraForm.value,
        cam_id: 0, // Add the cam_id field
        usb: null, // Ensure 'usb' is explicitly null
      };

      console.log('Form Data:', servicameraformData);

      this.service.addCameraType(servicameraformData).subscribe(
        (data: any) => {
          console.log('Response:', data);
          this.toastMessage = 'Surveillance Camera Saved Successfully!';
          this.showToast(); // Show success toast
          // Reset specific form controls except 'cameratype'
          this.serveillanceCameraForm.patchValue({
            url: '', // Reset URL field
          });
        },
        (error: HttpErrorResponse) => {
          console.log('Error:', error);

          // Check if the server provides a specific error message
          if (error.error && error.error.message) {
            this.toastMessage = error.error.message; // Show specific error message from the server
          } else if (error.error && error.error.error) {
            this.toastMessage = error.error.error; // Fallback to another error message if present
          } else {
            this.toastMessage = 'Failed to save the form. Please try again.'; // General fallback error message
          }
          this.showToast(); // Show error toast
        }
      );
    } else {
      this.toastMessage = 'Please fill out the form correctly.';
      this.showToast(); // Show validation toast
    }
  }
  // Show toast
  showToast() {
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, 3000); // Hide after 3 seconds
  }
  hideToast(): void {
    this.toastVisible = false;
  }
}

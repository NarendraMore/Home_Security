import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { ServiceService } from 'src/app/service/service.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  imagePreview: string | ArrayBuffer | null = null;
  uploadedImage: File | null = null;
  toastVisible = false; // Control the visibility of the toast
  toastMessage = ''; // Server message to be shown in the toast

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private service: ServiceService,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      country_code: ['', Validators.required],
      mobile: ['', Validators.required],
      backup_contact: ['', Validators.required],
      security_contact: ['', Validators.required],
      role: ['', Validators.required],
      image: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {}

  // Login functionality
  login(): void {
    if (this.loginForm.invalid) {
      return;
    }
  
    const formData = this.loginForm.value;
    this.authService.login(formData).subscribe(
      (response: any) => {
        const token = response.token;
        const role = response.userDetails.role;
  
        // Save token and role
        this.authService.setToken(token);
        this.authService.setRole(role);
  
        // Display success message
        this.toastMessage = 'Login successful!';
        this.showToast();
  
        // Redirect based on the role
        if (role === 'Admin') {
          this.router.navigate(['/sidebar/dashboard']);
        } else if (role === 'Client') {
          this.router.navigate(['/sidebar/dashboard']);
        }
      },
      (error: HttpErrorResponse) => {
        // Handle error response from server
        if (error.error && error.error.error) {
          this.toastMessage = error.error.error;  // Extract error message
        } else {
          this.toastMessage = 'Login failed. Please try again.';  // Fallback error message
        }
        this.showToast();
      }
    );
  }

  // Handle image upload for user registration
  onImageUpload(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.uploadedImage = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.uploadedImage);
    }
  }

  // Register a new user (with image upload)
  registerUser() {
    if (!this.uploadedImage) {
      console.error('Image file is missing');
      return;
    }
  
    const formData = new FormData();
    Object.keys(this.registerForm.value).forEach((key) => {
      formData.append(key, this.registerForm.value[key]);
    });
    formData.append('image', this.uploadedImage);
  
    this.service.registerNewuser(formData).subscribe(
      (response: any) => {
        // On success, show the success message and reset the form
        this.toastMessage = 'Registration successful!';
        this.showToast();
        this.registerForm.reset();
        this.imagePreview = null;
      },
      (error: any) => {
        // Handle error response from server
        if (error.error && error.error.message) {
          // Display the server's error message if it exists
          this.toastMessage = error.error.message;
        } else {
          // Fallback error message if the message is not available
          this.toastMessage = 'Registration failed. Please try again.';
        }
        // Show the error message in the toast
        this.showToast();
      }
    );
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

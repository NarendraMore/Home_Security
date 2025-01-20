import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/service/service.service';
import { environment } from 'src/environment/environment';
export interface inciedentdata {
  incident_type: string;
  time: string;
  date: string;
  _id: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!:
    | ElementRef
    | undefined;
  incidentDataArray: inciedentdata[] = [];
  searchText: string = '';
  p: number = 1;
  incidentImageUrl: any;
  incidentVideoUrl: any;
  itemsPerPage: any = 5;
  constructor(
    private router: Router,
    private service: ServiceService,
    private renderer: Renderer2
  ) {}
  ngOnInit() {
    this.loadIncidentData();
    this.service.notificationReceived$.subscribe(() => {
      console.log('New notification received. Refreshing dashboard data...');
      this.loadIncidentData();
    });
  }
  getIndex(i: number): number {
    return i + 1 + (Math.max(this.p, 1) - 1) * this.itemsPerPage;
  }

  loadIncidentData() {
    this.service.getIncedeentData(this.p, this.itemsPerPage).subscribe(
      (incidentData: any) => {
        this.incidentDataArray = incidentData.incidents || [];
        // Sort by date and time in descending order
        this.incidentDataArray.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`).getTime();
          const dateB = new Date(`${b.date}T${b.time}`).getTime();
          return dateB - dateA;
        });
        this.p = 1; // Reset pagination to first page when data is refreshed
        console.log('Incident Data:', this.incidentDataArray);
      },
      (error) => {
        console.error('Failed to load incident data:', error);
      }
    );
  }
  onclickLogout() {
    this.router.navigate(['/login']);
  }

  filteredData() {
    let data = this.incidentDataArray;

    if (this.searchText) {
      data = data.filter((item) =>
        Object.values(item).some((val) =>
          val.toString().toLowerCase().includes(this.searchText.toLowerCase())
        )
      );
    }

    return data.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateB - dateA; // Descending order
    });
  }

  onshowImage(imageId: any) {
    if (!imageId) {
      console.error('Invalid image ID');
      return;
    }

    this.incidentImageUrl = `${environment.url}/getIncidentImage/${imageId}`;
    console.log(this.incidentImageUrl);

    // Optional: Verify image load
    const img = new Image();
    img.src = this.incidentImageUrl;
    img.onload = () => console.log('Image loaded successfully');
    img.onerror = () => console.error('Failed to load image');
  }

  onshowVideo(videoId: any) {
    if (!videoId) {
      console.error('Invalid video ID');
      return;
    }

    this.incidentVideoUrl = `${environment.url}/getIncidentVideo/${videoId}`;
    // console.log('Video URL:', this.incidentVideoUrl);

    // Optional: Verify video load
    this.reloadVideo();
  }
  reloadVideo(): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      this.renderer.setAttribute(
        this.videoPlayer.nativeElement,
        'src',
        this.incidentVideoUrl
      );
      this.videoPlayer.nativeElement.load();
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NamedTemplateDirective } from "../dashboard/dashboard.component";
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import {CardModule} from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { FileUploadModule } from 'primeng/fileupload';
@Component({
  selector: 'app-crop',
  imports: [CommonModule,ImageCropperComponent,CardModule, FileUploadModule,TabsModule],
  templateUrl: './crop.component.html',
  styleUrl: './crop.component.scss'
})
export class CropComponent {






   imageChangedEvent: Event | null = null;
    croppedImage: SafeUrl  = '';
    file:File | null = null;
    constructor(
      private sanitizer: DomSanitizer
    ) {
    }

onFileSelect(event: any): void {
    // PrimeNG stores the selected files in an array directly on the event object
    if (event.files && event.files.length > 0) {
        this.file = event.files[0];
    }
}
    imageCropped(event: ImageCroppedEvent) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.objectUrl);
      // event.blob can be used to upload the cropped image
    }
    imageLoaded(image: LoadedImage) {
        // show cropper
    }
    cropperReady() {
        // cropper ready
    }
    loadImageFailed() {
        // show message
    }








/*


  @ViewChild('sourceImage') sourceImage!: ElementRef<HTMLImageElement>;

  private readonly CROP_SIZE: number = 320;
  private readonly MAX_BLEED: number = 50; 
  
  private startDragX: number = 0; 
  private startDragY: number = 0;
  private startX: number = 0; 
  private startY: number = 0;
  
  naturalWidth: number = 0;
  naturalHeight: number = 0;
  x: number = 0;
  y: number = 0;
  baseScale: number = 1; 
  scale: number = 1;
  rotation: number = 0;
  isDragging: boolean = false;

  imgSrc: string | null = null;
  croppedResult: string | null = null;

  get isRotated(): boolean {
    return this.rotation % 180 !== 0;
  }

  get activeWidth(): number {
    return this.isRotated ? this.naturalHeight : this.naturalWidth;
  }

  get activeHeight(): number {
    return this.isRotated ? this.naturalWidth : this.naturalHeight;
  }

  get containerWidth(): number {
    if (!this.naturalWidth) return this.CROP_SIZE;
    const currentVisWidth: number = this.activeWidth * this.scale;
    const overflowX: number = Math.max(0, currentVisWidth - this.CROP_SIZE);
    return this.CROP_SIZE + Math.min(this.MAX_BLEED * 2, overflowX);
  }

  get containerHeight(): number {
    if (!this.naturalHeight) return this.CROP_SIZE;
    const currentVisHeight: number = this.activeHeight * this.scale;
    const overflowY: number = Math.max(0, currentVisHeight - this.CROP_SIZE);
    return this.CROP_SIZE + Math.min(this.MAX_BLEED * 2, overflowY);
  }

  onFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imgSrc = null;
      this.croppedResult = null;
      const file: File = input.files[0];
      const reader: FileReader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        this.imgSrc = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageLoad(event: Event): void {
    const img: HTMLImageElement = event.target as HTMLImageElement;
    this.naturalWidth = img.naturalWidth;
    this.naturalHeight = img.naturalHeight;
    this.updateBaseScale();
    this.scale = this.baseScale;
    this.clampPosition();
  }

  private updateBaseScale(): void {
    this.baseScale = Math.max(
      this.CROP_SIZE / this.activeWidth,
      this.CROP_SIZE / this.activeHeight
    );
  }

  rotateImage(): void {
    const oldX: number = this.x;
    const oldY: number = this.y;
    this.x = -oldY;
    this.y = oldX;
    this.rotation = (this.rotation + 90) % 360;
    this.updateBaseScale();
    if (this.scale < this.baseScale) {
      const ratio: number = this.baseScale / this.scale;
      this.x = this.x * ratio;
      this.y = this.y * ratio;
      this.scale = this.baseScale;
    }
    this.clampPosition();
  }

  onDragStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    const isTouch: boolean = 'touches' in event;
    this.startDragX = isTouch ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    this.startDragY = isTouch ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;
    this.startX = this.x;
    this.startY = this.y;
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    const isTouch: boolean = 'touches' in event;
    const clientX: number = isTouch ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY: number = isTouch ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    this.x = this.startX + (clientX - this.startDragX);
    this.y = this.startY + (clientY - this.startDragY);
    this.clampPosition();
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta: number = event.deltaY < 0 ? 0.05 : -0.05;
    this.deltaZoom(delta);
  }

  onSliderChange(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const zoomValue: number = parseFloat(target.value);
    this.zoom(zoomValue);
  } 

  deltaZoom(delta: number): void {
    const zoomValue: number = this.scale + delta;
    this.zoom(zoomValue);
  }

  private zoom(zoomValue: number): void {
    zoomValue = Math.max(this.baseScale, Math.min(zoomValue, this.baseScale * 3));

    const ratio: number = zoomValue / this.scale;
    this.x = this.x * ratio;
    this.y = this.y * ratio;

    this.scale = zoomValue;
    this.clampPosition();
  }

  private clampPosition(): void {
    if (this.naturalWidth === 0) return;

    const currentVisWidth: number = this.activeWidth * this.scale;
    const currentVisHeight: number = this.activeHeight * this.scale;

    const boundX: number = Math.max(0, (currentVisWidth - this.CROP_SIZE) / 2);
    const boundY: number = Math.max(0, (currentVisHeight - this.CROP_SIZE) / 2);

    this.x = Math.max(-boundX, Math.min(this.x, boundX));
    this.y = Math.max(-boundY, Math.min(this.y, boundY));
  }

  cropImage(): void {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = this.CROP_SIZE;
    canvas.height = this.CROP_SIZE;
    const ctx: CanvasRenderingContext2D  = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(this.CROP_SIZE / 2, this.CROP_SIZE / 2); 
    ctx.translate(this.x, this.y); 
    ctx.scale(this.scale, this.scale); 
    ctx.rotate((this.rotation * Math.PI) / 180);

    ctx.drawImage(
      this.sourceImage.nativeElement, 
      -this.naturalWidth / 2, 
      -this.naturalHeight / 2
    );

    this.croppedResult = canvas.toDataURL('image/png');
  }*/
}

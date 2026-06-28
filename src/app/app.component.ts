import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { DashboardComponent } from './dashboard/dashboard.component';
import { CropComponent } from './crop/crop.component';
/*
import jakarta.activation.DataHandler;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import java.io.ByteArrayOutputStream;

public class EmailSender {

    public void sendeExcelEmail(Session session, String to, ByteArrayOutputStream excelStream) throws Exception {
        // Multi-Part-Objekt für Text und Anhang erstellen
        Multipart multipart = new MimeMultipart();

        // 1. Text-Teil der E-Mail
        MimeBodyPart textPart = new MimeBodyPart();
        textPart.setText("Hallo,\n\nanbei finden Sie die gewünschte Excel-Datei.");
        multipart.addBodyPart(textPart);

        // 2. Excel-Anhang-Teil
        byte[] bytes = excelStream.toByteArray();
        String excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        ByteArrayDataSource dataSource = new ByteArrayDataSource(bytes, excelMimeType);
        
        MimeBodyPart attachmentPart = new MimeBodyPart();
        attachmentPart.setDataHandler(new DataHandler(dataSource));
        attachmentPart.setFileName("daten_export.xlsx"); // Gewünschter Dateiname
        multipart.addBodyPart(attachmentPart);

        // 3. Gesamt-Nachricht aufbauen
        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress("sender@example.com"));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        message.setSubject("Ihr Excel-Export");
        message.setContent(multipart);

        // 4. E-Mail senden
        Transport.send(message);
    }
}
*/

 const TARGET_WIDTH: number = 600;

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet, DashboardComponent, CropComponent, CommonModule],
  template: `
  
<app-crop></app-crop>
<!--
    <div class="canvas-container">
      <div class="canvas-wrapper">
      <canvas #canvas width="600">
      </canvas>
      <div class="v-line" [style.left.%]="focusValueX"></div>
      <div class="h-line" [style.top.%]="focusValueY"></div>
      <div class="crosshair ch-v" [style.left.%]="focusValueX" [style.top.%]="focusValueY"></div>
      <div class="crosshair ch-h" [style.left.%]="focusValueX" [style.top.%]="focusValueY"></div>
      
</div >
      <input #verticalSlider
            type="range" 
            min="0" 
            max="100" 
            step="1" 
            [(ngModel)]="focusValueY" 
            class="vertical-slider"
        >
         <input #horizontalSlider
    type="range" 
    min="0" 
    max="100" 
    step="1" 
    [(ngModel)]="focusValueX" 
    class="horizontal-slider"
  >
    </div>

   <div class="preview-container">
      <div class="preview-canvas-wrapper">
        <img *ngIf="imageUrl"
             [src]="imageUrl"
             [style.width.px]="previewBoxWidth"
             [style.height.px]="previewBoxHeight"
             [style.object-position]="customObjectPosition"
             class="real-preview-img">
      </div>
      
      <div class="preview-controls">
        <label>Simulierte Breite: {{ simulatedWidth }}px</label>
        <input #previewSlider type="range" 
               min="200" max="1200" step="1" 
               [(ngModel)]="simulatedWidth" 
               class="preview-slider">
      </div>
    </div>
-->
  `,
  styles: [` 
  

   .preview-container {
      margin-top: 40px; 
      width: 600px;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .preview-canvas-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 4px;
      box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
    }

    /* Neu: Styling für das nativ berechnete Vorschau-Bild */
    .real-preview-img {
      object-fit: cover;
      display: block;
      background: #eee;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }

    .preview-controls {
      margin-top: 15px;
      font-family: sans-serif;
      font-size: 14px;
      color: #333;
    }

.canvas-wrapper {
  position: relative; /* Die Linie orientiert sich jetzt hier */
  width: fit-content;
  height: auto;
  display: inline-block;
}
    .canvas-container { 
   position: relative; 
  user-select: none; 
  line-height: 0;
  display: block; 
  width: fit-content; 
  height: auto;  
  padding-right: 40px; 
    }

    .h-line {
      position: absolute;
      left: 0;
      width: 100%;
      border-top: 2px dashed blue;
      box-sizing: border-box;
      pointer-events: none;
    }

    .v-line {
      position: absolute;
      top: 0;
      height: 100%;
      border-left: 2px dashed blue;
      box-sizing: border-box;
      pointer-events: none;
    }

    canvas { 
      display: block; 
      position: relative;
      background: #fff; 
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
    }

    .vertical-slider {
 position: absolute;
  top: 0;
  right: 0;
 
  width: 25px; 

  margin: 0; 
  cursor: pointer;
  writing-mode: vertical-lr; 

}

    .horizontal-slider {
display: block;
  /* Zwingt den Slider haargenau auf die aktuelle Container-Höhe (die vom Canvas bestimmt wird) */
        /* Haargenau dieselbe Breite wie dein Canvas */
  margin: 15px 0 0 0;
  margin: 0; 
  cursor: pointer; 

}

    .crosshair {
      position: absolute;
      background: #ff0000;
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
      pointer-events: none;
    }

    .ch-v {
   
      margin-top: -10px; 
      width: 2px;
      height: 20px;
      transform: translateX(-50%);
    }

    .ch-h {
  
      margin-left: -10px; 
      height: 2px;
      width: 20px;
      transform: translateY(-50%);
    }
  `]
})
export class AppComponent {
  @ViewChild('canvas') canvas!: ElementRef;
  @ViewChild('previewCanvas') previewCanvas!: ElementRef;
  @ViewChild('horizontalSlider') horizontalSlider!: ElementRef;
  @ViewChild('verticalSlider') verticalSlider!: ElementRef;
  @ViewChild('previewSlider') previewSlider!: ElementRef;

  focusValueX: number = 50;
  focusValueY: number = 50;
  simulatedWidth: number = 1000;
  simulatedHeight: number = 500;

  originalImage: HTMLImageElement = null;
  imageUrl: string = "https://m.media-amazon.com/images/I/71rds6e+WeL._SX425_.jpg";

  get previewBoxWidth(): number {
    const scale = Math.min(600 / this.simulatedWidth, 1); // 1 = 500/500 (Max Display Height / Virtual Height)
    return this.simulatedWidth * scale;
  }

  // Berechnet die korrespondierende skalierte Höhe (basierend auf max 500px)
  get previewBoxHeight(): number {
    const scale = Math.min(600 / this.simulatedWidth, 1);
    return this.simulatedHeight * scale; 
  }

  get customObjectPosition(): string {
    if (!this.originalImage) return '50% 50%';

    const boxW = this.previewBoxWidth;
    const boxH = this.previewBoxHeight;
    const imgW = this.originalImage.width;
    const imgH = this.originalImage.height;

    // 1. Wie stark wird der Browser das Bild skalieren (object-fit: cover)?
    const scale = Math.max(boxW / imgW, boxH / imgH);
    const scaledImgW = imgW * scale;
    const scaledImgH = imgH * scale;

    // 2. Wo liegt der Fokuspunkt in Pixeln auf dem hochskalierten Bild?
    const focusPxX = scaledImgW * (this.focusValueX / 100);
    const focusPxY = scaledImgH * (this.focusValueY / 100);

    // 3. Wie müssen wir das Bild verschieben, damit dieser Punkt exakt in der Box-Mitte liegt?
    let offsetX = (boxW / 2) - focusPxX;
    let offsetY = (boxH / 2) - focusPxY;

    // 4. Clamping: Das Bild darf nicht weiter verschoben werden, als Bildmaterial da ist.
    offsetX = Math.max(boxW - scaledImgW, Math.min(0, offsetX));
    offsetY = Math.max(boxH - scaledImgH, Math.min(0, offsetY));

    // 5. Rechne diese perfekten Pixel-Offsets zurück in CSS-Prozente für object-position
    const cssPosX = boxW === scaledImgW ? 50 : (offsetX / (boxW - scaledImgW)) * 100;
    const cssPosY = boxH === scaledImgH ? 50 : (offsetY / (boxH - scaledImgH)) * 100;

    return `${cssPosX}% ${cssPosY}%`;
  }

  ngAfterViewInit() {
    const img: HTMLImageElement = new Image();
    img.crossOrigin = "anonymous"; 
    img.src = 'https://m.media-amazon.com/images/I/71rds6e+WeL._SX425_.jpg';
    img.onload = () => {
      this.originalImage = img;
      const aspectRatio = img.height / img.width;
      const targetHeight = TARGET_WIDTH * aspectRatio;
      this.canvas.nativeElement.height = targetHeight;
      this.canvas.nativeElement.style.height = targetHeight + 'px';
      this.horizontalSlider.nativeElement.style.width = TARGET_WIDTH + 'px';
      this.previewSlider.nativeElement.style.width = TARGET_WIDTH + 'px';
      this.verticalSlider.nativeElement.style.height  = targetHeight + 'px';
      const ctx: CanvasRenderingContext2D = this.canvas.nativeElement.getContext('2d');
      ctx.drawImage(img, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
  
    }
  }
}
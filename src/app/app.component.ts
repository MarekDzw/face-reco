import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as faceapi from '@vladmandic/face-api/dist/face-api.esm.js';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, ButtonModule, DividerModule, FileUploadModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('video') video!: ElementRef;
  @ViewChild('canvas') canvas!: ElementRef;
  @ViewChild('upload') upload!: FileUpload;

  interval: NodeJS.Timeout | undefined;
  videoStop = true;
  showVideo = false;

  async ngAfterViewInit() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./../assets/model');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./../assets/model');
    await faceapi.nets.faceRecognitionNet.loadFromUri('./../assets/model');
    await faceapi.nets.faceExpressionNet.loadFromUri('./../assets/model');
    await faceapi.nets.ageGenderNet.loadFromUri('./../assets/model');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('./../assets/model');
  }

  async startDetection() {
    if (!this.videoStop) {
      return;
    }
    this.videoStop = false;
    const canvas = faceapi.createCanvasFromMedia(this.video.nativeElement);
    document.body.append(canvas);

    const displaySize = {
      width: this.video.nativeElement.width,
      height: this.video.nativeElement.height,
    };
    faceapi.matchDimensions(canvas, displaySize);

    this.interval = setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(
          this.video.nativeElement,
          new faceapi.TinyFaceDetectorOptions(),
        )
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors()
        .withAgeAndGender();
      canvas.setAttribute('id', 'canvas');
      canvas.setAttribute(
        'style',
        `position: fixed;
    top: 60px;
    left: 0;`,
      );
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      resizedDetections.forEach((detection) => {
        const age = detection.age;
        const interpolatedAge = Math.round(age);
        const gender = detection.gender;
        const expressions = detection.expressions;
        const maxValue = Math.max(...Object.values(expressions));

        const dominantExpression = Object.keys(expressions).filter(
          // @ts-ignore
          (item) => expressions[item] === maxValue,
        )[0];

        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          label: `${faceapi.utils.round(interpolatedAge, 0)} years, ${gender}, ${dominantExpression}`,
        });
        const drawBox1 = new faceapi.draw.DrawBox(detection.detection.box, {
          label: `${faceapi.utils.round(interpolatedAge, 0)} years, ${gender}, ${dominantExpression}`,
        });
        drawBox.draw(canvas);
        drawBox1.draw(canvas);
      });
    }, 10);
  }

  public startCamera() {
    this.showVideo = true;

    this.removeImg();
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      this.video.nativeElement.srcObject = stream;
      this.video.nativeElement.addEventListener('play', () => {
        this.startDetection();
      });
    });
  }

  public uploadImage(e: any): void {
    this.showVideo = false;
    this.removeImg();

    const file = e.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptors()
          .withAgeAndGender();

        // Create a canvas and append it to the body of the document
        const canvas = faceapi.createCanvasFromMedia(img);
        document.body.append(canvas);

        // Match the dimension of the canvas with the image
        faceapi.matchDimensions(canvas, img);

        // Resize the detections to match the image size
        const resizedDetections = faceapi.resizeResults(detections, img);

        // Draw the detections on the canvas
        resizedDetections.forEach((detection) => {
          const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
            label: `${faceapi.utils.round(detection.age, 0)} years, ${detection.gender}, ${detection.expressions.asSortedArray()[0].expression}`,
          });
          drawBox.draw(canvas);
        });

        // Create an img element to display the uploaded image
        const imageElement = document.createElement('img');
        imageElement.style.marginLeft = '10px';
        imageElement.style.marginTop = '10px';
        imageElement.src = event.target?.result as string;
        document.body.appendChild(imageElement);

        // Set the canvas position to be over the image
        canvas.style.position = 'absolute';
        canvas.style.top = imageElement.offsetTop + 'px';
        canvas.style.left = imageElement.offsetLeft + 'px';
      };
    };
    reader.readAsDataURL(file);
    this.upload.clear();
  }

  public stopCamera(): void {
    const stream = this.video.nativeElement.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(function (track: any) {
      track.stop();
    });
    this.video.nativeElement.srcObject = null;
    this.videoStop = true;
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.remove();
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    this.video.nativeElement.removeEventListener('play', this.startDetection);
  }

  private removeImg() {
    const imageElement = document.querySelector('img');
    const canvas = document.querySelector('canvas');
    if (imageElement) {
      document.body.removeChild(imageElement);
    }
    if (canvas) {
      document.body.removeChild(canvas);
    }
  }
}

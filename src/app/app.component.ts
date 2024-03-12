import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as faceapi from '@vladmandic/face-api/dist/face-api.esm.js';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit{
  @ViewChild('video') video!: ElementRef;
  @ViewChild('canvas') canvas!: ElementRef;

  async ngAfterViewInit() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./../assets/model');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./../assets/model');
    await faceapi.nets.faceRecognitionNet.loadFromUri('./../assets/model');
    await faceapi.nets.faceExpressionNet.loadFromUri('./../assets/model');
    await faceapi.nets.ageGenderNet.loadFromUri('./../assets/model');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('./../assets/model');

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.video.nativeElement.srcObject = stream;
        this.video.nativeElement.addEventListener('play', () => {
          this.startDetection();
        });
      });
  }

  async startDetection() {
    const canvas = faceapi.createCanvasFromMedia(this.video.nativeElement);
    document.body.append(canvas);

    const displaySize = { width: this.video.nativeElement.width, height: this.video.nativeElement.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(this.video.nativeElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withFaceDescriptors().withAgeAndGender();
      canvas.setAttribute('id', 'canvass');
      canvas.setAttribute(
        'style',`position: fixed;
    top: 0;
    left: 0;`
      );
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      resizedDetections.forEach(detection => {
        const age = detection.age;
        const interpolatedAge = Math.round(age);
        const gender = detection.gender;
        const expressions = detection.expressions;
        const maxValue = Math.max(...Object.values(expressions));
        // @ts-ignore
        const dominantExpression = Object.keys(expressions).filter(item => expressions[item] === maxValue)[0];

        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, { label: `${faceapi.utils.round(interpolatedAge, 0)} years, ${gender}, ${dominantExpression}` });
        const drawBox1 = new faceapi.draw.DrawBox(detection.detection.box, { label: `${faceapi.utils.round(interpolatedAge, 0)} years, ${gender}, ${dominantExpression}` });
        drawBox.draw(canvas);
        drawBox1.draw(canvas);
      });

    }, 10);
  }
}

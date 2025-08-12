# AI Models Directory

This directory contains AI models for hate speech detection.

## Usage

Place your trained models here. The extension will load models from this directory at runtime.

## Supported Formats

- TensorFlow.js models (.json + .bin files)
- ONNX models (.onnx files)
- Custom model formats (implement loading logic in background script)

## Example Structure

```
models/
├── hate-speech-detector/
│   ├── model.json
│   ├── weights.bin
│   └── vocabulary.json
└── README.md
```

## Loading Models

Models are loaded dynamically by the background service worker. Update the classification logic in `src/background.ts` to use your specific model format. 
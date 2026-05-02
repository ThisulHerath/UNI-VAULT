# UniVault System Architecture Diagram

This diagram reflects the current mobile app, backend API, storage, and realtime layers in UniVault.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Arial",
  "fontSize": "20px",
  "primaryColor": "#f7f7f7",
  "primaryTextColor": "#111111",
  "primaryBorderColor": "#4b5563",
  "lineColor": "#4b5563",
  "secondaryColor": "#eef2ff",
  "tertiaryColor": "#ffffff"
  },
  "flowchart": {
    "curve": "basis"
  }
}}%%
flowchart TB
  U[Student / End User]

  subgraph M[Mobile App - Expo / React Native]
    direction TB
    M1[Expo Router UI]
    M2[AuthContext + AsyncStorage]
    M3[Feature services\nnotes, subjects, reviews, requests, collections, groups]
    M4[Axios API client\nJWT token attached automatically]
    M5[Socket.IO client]

    M1 --> M2 --> M3 --> M4
    M1 --> M5
  end

  subgraph B[Backend API - Node.js / Express]
    direction TB
    B1[Express server\nRoutes + middleware + controllers]
    B2[Security\nhelmet, cors, mongo-sanitize]
    B3[REST endpoints\n/auth /notes /subjects /reviews\n/requests /collections /groups]
    B4[Socket.IO realtime\ngroup chat + live events]

    B1 --> B2 --> B3 --> B4
  end

  subgraph D[Data and Storage]
    direction TB
    D1[(MongoDB)]
    D2[(File storage\nuploads / note files / GridFS)]
  end

  U --> M1
  M4 -->|REST + JWT| B1
  M5 <-->|WebSocket| B4
  B3 --> D1
  B3 --> D2
```

## How to view it in VS Code

1. Open `system-architecture-diagram.md` in VS Code.
2. Press `Ctrl+Shift+V` to open Markdown Preview, or run `Markdown: Open Preview` from the Command Palette.
3. Use `Ctrl+Shift+V` for a full preview tab.
4. Set the preview zoom to 125% or 150% before exporting so the text stays readable in JPG/PDF.
5. The Mermaid diagram should render automatically because the code block starts with `mermaid`.

## Best Screenshot Result

1. Open the preview in its own tab so the diagram has maximum height.
2. Hide the file tree and any side panels before taking the screenshot.
3. Use the browser or preview zoom at 150% if you want the labels to stay readable after export.
4. If you still cannot fit it on one screen, reduce the VS Code zoom with Ctrl+- once, then screenshot the preview only.
5. For a PDF, print the preview page; for a JPG, capture the preview and crop the border tightly.

## How to use it in your report

1. If your report supports Markdown, paste the whole Mermaid block directly.
2. If your report needs an image, open the preview and take a screenshot of the rendered diagram.
3. If you want, I can also turn this into a cleaner PDF-style version or make it more detailed for an academic report.
services:
  - type: web
    name: fantasy-cricket-champ
    env: node
    buildCommand: |
      # Run the ESM build script 
      node --experimental-modules render-build.js
    startCommand: node --experimental-modules render-start.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000

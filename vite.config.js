import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import the 'path' module for robust path resolution

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Set the input to your index.html file within the public directory
      input: path.resolve(__dirname, 'public/index.html')
    }
  }
})
Write-Host "🚀 Setting up LenDen Project"

Write-Host "Installing root dependencies..."
npm install --legacy-peer-deps
npx expo install expo-image-manipulator

Write-Host "Installing backend dependencies..."
cd backend

npm install --legacy-peer-deps
npm install express cors dotenv bcrypt jsonwebtoken multer cloudinary --legacy-peer-deps
npx expo install @react-native-community/datetimepicker
npm install expo-image-picker --legacy-peer-deps

cd ..

Write-Host "✅ Setup completed successfully!"

Write-Host "To start the project:"
Write-Host "1️⃣ Start backend:"
Write-Host "cd backend && npm run dev"
Write-Host ""
Write-Host "2️⃣ Start frontend:"
Write-Host "npx expo start"
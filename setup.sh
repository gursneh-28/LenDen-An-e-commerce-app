echo "🚀 Setting up LenDen Project"

echo "Installing root dependencies..."
npm install --legacy-peer-deps

echo "Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps
npm install express cors dotenv bcrypt jsonwebtoken multer cloudinary nodemailer --legacy-peer-deps
npx expo install @react-native-community/datetimepicker
npm install expo-image-picker --legacy-peer-deps
cd ..

echo "✅ Setup completed successfully!"

echo "To start the project:"
echo "1️⃣ Start backend:"
echo "  cd backend && npm run dev"
echo ""
echo "2️⃣ Start frontend:"
echo "   npx expo start"

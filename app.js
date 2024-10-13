require('dotenv').config();
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const passport = require('passport');
const multer = require('multer');
const { ensureAuthenticated } = require('./Frontend/middleware/auth');


// Importar rutas
const RegistroRoutes = require('./Backend/routes/registroRoutes');
const reportRoutes = require('./Frontend/routes/reportRoutes');
const userRoutes = require('./Frontend/routes/userRoutes');
const mascotaRoutes = require('./Frontend/routes/mascotaRoutes');
// Inicializar Express
const app = express();
const server = http.createServer(app);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './Frontend/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
// Configurar body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Frontend', 'views'));
app.use(expressLayouts);

// Configurar carpeta pública para los avatares
app.use('/images', express.static(path.join(__dirname, 'Frontend', 'public', 'images')));

// Configurar carpeta pública para otros archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'Frontend', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'Frontend', 'uploads')));

// Configurar sesión
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

// Inicializar Passport
const initializePassport = require('./Frontend/passportConfig');
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// Middleware para pasar datos a las vistas
app.use((req, res, next) => {
  res.locals.username = req.session.username || null;
  res.locals.userId = req.session.userId || null;
  res.locals.propietarioId = req.session.propietarioId || null;
  res.locals.dominio = process.env.DOMINIO;

  next();
});

app.post('/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se subió ningún archivo.');
  }
  res.json({ filePath: `/uploads/${req.file.filename}` });
});


// Configurar rutas de la aplicación (protegidas por autenticación)
app.use('/api', RegistroRoutes); // Rutas de registro
app.use('/mis-mascotas', ensureAuthenticated, mascotaRoutes); // Rutas de mascotas protegidas
app.use('/info', ensureAuthenticated, reportRoutes); // Rutas de reportes protegidas
app.use('/users', userRoutes); // Rutas de usuarios
app.use('/', ensureAuthenticated, mascotaRoutes); // Ruta protegida para mascotas

// Ruta raíz con autenticación
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/'); 
  } else {
    res.redirect('/users/login');
  }
});

// Ruta protegida ejemplo
app.get('/', ensureAuthenticated, (req, res) => {
  res.render('index'); // Vista home.ejs
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

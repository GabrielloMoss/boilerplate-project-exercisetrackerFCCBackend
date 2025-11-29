const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
let bodyParser = require("body-parser");

const Schema = mongoose.Schema;

// Leer la URI desde MONGODB_URI
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error(
    "MONGODB_URI no definida en Secrets. Asegúrate de configurarla en Replit.",
  );
  process.exit(1);
}

// Conexión simplificada (sin opciones obsoletas)
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado a MongoDB correctamente");
  } catch (err) {
    console.error("Error al conectar a MongoDB:", err);
    process.exit(1);
  }
}

async function startServer() {
  // Define el schema de usuario
  const userSchema = new Schema({
    username: { type: String, required: true },
  });
  const User = mongoose.model("User", userSchema);

  // Define el schema de ejercicio
  const exerciseSchema = new Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
  });
  const Exercise = mongoose.model("Exercise", exerciseSchema);

  // Middleware
  app.use(cors());
  app.use(express.static("public"));
  app.use("/", bodyParser.urlencoded({ extended: false }));
  app.use(express.json());

  // Rutas
  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
  });

  // POST /api/users - Crear nuevo usuario
  app.post("/api/users", async (req, res) => {
    try {
      const username = req.body.username;
      const newUser = new User({ username: username });
      const savedUser = await newUser.save();
      res.json({ username: savedUser.username, _id: savedUser._id });
    } catch (err) {
      console.error("Error al crear usuario:", err);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  // GET /api/users - Obtener todos los usuarios
  app.get("/api/users", async (req, res) => {
    try {
      const users = await User.find({}).select("_id username");
      res.json(users);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  // POST /api/users/:_id/exercises - Agregar ejercicio
  app.post("/api/users/:_id/exercises", async (req, res) => {
    try {
      const userId = req.params._id;
      const { description, duration, date } = req.body;

      // Buscar usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Procesar fecha
      let exerciseDate;
      if (date) {
        exerciseDate = new Date(date);
      } else {
        exerciseDate = new Date();
      }

      // Crear ejercicio
      const newExercise = new Exercise({
        userId: userId,
        description: description,
        duration: parseInt(duration),
        date: exerciseDate,
      });

      const savedExercise = await newExercise.save();

      // Responder con el formato requerido
      res.json({
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
        _id: user._id,
      });
    } catch (err) {
      console.error("Error al agregar ejercicio:", err);
      res.status(500).json({ error: "Error al agregar ejercicio" });
    }
  });

  // GET /api/users/:_id/logs - Obtener log de ejercicios
  app.get("/api/users/:_id/logs", async (req, res) => {
    try {
      const userId = req.params._id;
      const { from, to, limit } = req.query;

      // Buscar usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Construir filtro de fecha
      let dateFilter = { userId: userId };
      if (from || to) {
        dateFilter.date = {};
        if (from) {
          dateFilter.date.$gte = new Date(from);
        }
        if (to) {
          dateFilter.date.$lte = new Date(to);
        }
      }

      // Buscar ejercicios
      let exercisesQuery = Exercise.find(dateFilter).select(
        "description duration date",
      );

      if (limit) {
        exercisesQuery = exercisesQuery.limit(parseInt(limit));
      }

      const exercises = await exercisesQuery.exec();

      // Formatear log
      const log = exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      }));

      // Responder con el formato requerido
      res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log: log,
      });
    } catch (err) {
      console.error("Error al obtener logs:", err);
      res.status(500).json({ error: "Error al obtener logs" });
    }
  });

  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
  });
}

// Conectar y luego iniciar servidor
connectDB().then(startServer);

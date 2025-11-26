const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
let bodyParser = require('body-parser');

const Schema = mongoose.Schema; // definir Schema antes de usarlo

const MONGO_URI = process.env.MONGO_URI;

// Conexión simplificada (compatible con mongoose 9+)
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB correctamente');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  }
}
connectDB();

const userSchema = new Schema({
  username: { type: String, requerid: true }
});
let userModel = mongoose.model('user', userSchema);

app.use(cors());
app.use(express.static('public'));
app.use('/', bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  let newUser = userModel({ username: username });
  newUser.save();
  res.json(newUser);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
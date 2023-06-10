import express from 'express';
import { chatCompletion } from './chat-completion.js';
import { PORT } from './config.js';
import cors from 'cors';
const app = express();

app.use(cors());
app.use(express.json()); // Agrega esta línea
app.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Hello world' });
});
app.post('/', chatCompletion);

app.listen(PORT, () => {
  console.log(`Servidor Express iniciado en http://localhost:${PORT}`);
});

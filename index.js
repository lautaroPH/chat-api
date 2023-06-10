import express from 'express';
import { chatCompletion } from './chat-completion.js';
import cors from 'cors';

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); // Agrega esta línea
app.post('/', chatCompletion);

app.listen(port, () => {
  console.log(`Servidor Express iniciado en http://localhost:${port}`);
});

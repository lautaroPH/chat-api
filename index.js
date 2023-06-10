import express from 'express';
import { chatCompletion } from './chat-completion.js';

const app = express();
const port = 4000;

app.use(express.json()); // Agrega esta línea
app.use('/', (req, res, next) => {
  res.status.json({ message: 'Hello world' });
});
app.post('/', chatCompletion);

app.listen(port, () => {
  console.log(`Servidor Express iniciado en http://localhost:${port}`);
});

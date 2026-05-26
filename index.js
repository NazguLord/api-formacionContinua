import app from './src/app.js';
import { iniciarSincronizacionAutomatica } from './src/services/sync.service.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
  iniciarSincronizacionAutomatica({ port: PORT });
});

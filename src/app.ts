import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { SocketIOSetup } from './io';

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const socketIO = new SocketIOSetup(server);

// Middleware
app.use(express.json());
app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
}));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Start server
server.listen(config.PORT, () => {
    
});

export { app, server, socketIO };
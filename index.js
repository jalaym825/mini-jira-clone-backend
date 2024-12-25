const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require("socket.io");
const http = require("http");
require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store global task state
let globalTasks = {
    pending: [
        { id: 1, title: 'Research competitor products', description: 'Analyze top 3 competitors', priority: 'High' },
        { id: 2, title: 'Update documentation', description: 'Add new API endpoints', priority: 'Medium' },
    ],
    working: [
        { id: 3, title: 'Fix navigation bug', description: 'Mobile menu not closing', priority: 'High' },
    ],
    completed: [
        { id: 4, title: 'Design review', description: 'Review homepage mockups', priority: 'Low' },
    ],
};
io.on('connection', (socket) => {
    console.log('a user connected');

    // Send current state to newly connected client
    socket.emit('initial:state', globalTasks);

    socket.on('task:move', (data) => {
        // Update global state
        let { taskId, targetColumn } = data;
        let foundTask;
        for(let status in globalTasks) {
            for(let task of globalTasks[status]) {
                if(task.id === taskId) {
                    foundTask = {
                        status, task
                    };
                }
            }
        }
        let sourceColumn = foundTask.status;
        if(sourceColumn === targetColumn)
            return;
                
        globalTasks = {
            ...globalTasks,
            [sourceColumn]: globalTasks[sourceColumn].filter(t => t.id !== taskId),
            [targetColumn]: [...globalTasks[targetColumn], foundTask.task],
        };

        // Broadcast to all clients except sender
        socket.broadcast.emit('task:move', {
            taskId, sourceColumn, targetColumn
        });
    });

    socket.on('task:edit', data => {
        const {status, taskId, field, value:newValue} = data;
        globalTasks[status] = globalTasks[status].map(task => {
            if(task.id === taskId){
                task[field] = newValue;
            }
            return task;
        });
        socket.broadcast.emit('task:edit', data);
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
})

server.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
